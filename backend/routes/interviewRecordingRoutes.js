const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const express = require("express");
const multer = require("multer");
const streamifier = require("streamifier");
const cloudinary = require("../config/cloudinary");
const Application = require("../models/Application");
const { getInterviewDetails } = require("../controllers/interviewController");

const router = express.Router();
const tempRecordingDir = path.join(__dirname, "..", "private_storage", "interview-recordings-temp");

const recordingUpload = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => {
            fs.mkdirSync(tempRecordingDir, { recursive: true });
            cb(null, tempRecordingDir);
        },
        filename: (req, file, cb) => {
            const extension = path.extname(file.originalname || "") || ".webm";
            cb(null, `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${extension}`);
        }
    }),
    limits: {
        // Full interview videos are much larger than single-answer audio snippets.
        fileSize: 300 * 1024 * 1024
    }
});

function sanitizeRecordingSegment(value) {
    return String(value || "unknown")
        .replace(/[^a-zA-Z0-9_-]/g, "")
        .slice(0, 40) || "unknown";
}

function buildRecordingSessionId(userId, jobId) {
    const userSegment = sanitizeRecordingSegment(userId);
    const jobSegment = sanitizeRecordingSegment(jobId);
    const timestamp = Date.now();
    const suffix = crypto.randomBytes(4).toString("hex");
    return `rec_${userSegment}_${jobSegment}_${timestamp}_${suffix}`;
}

function getUploadedRecordingFile(req) {
    if (req.file) return req.file;
    if (req.files?.recording?.[0]) return req.files.recording[0];
    if (req.files?.audio?.[0]) return req.files.audio[0];
    return null;
}

function buildPlaybackUrl(publicId) {
    return cloudinary.url(publicId, {
        resource_type: "video",
        secure: true,
        transformation: [
            {
                quality: "auto",
                fetch_format: "mp4",
                video_codec: "h264",
                audio_codec: "aac"
            }
        ]
    });
}

function uploadRecordingToCloudinary(file, options) {
    if (file?.path) {
        return cloudinary.uploader.upload(file.path, options);
    }

    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
            if (result) {
                resolve(result);
            } else {
                reject(error || new Error("Cloudinary upload failed"));
            }
        });

        streamifier.createReadStream(file.buffer).pipe(stream);
    });
}

async function cleanupTemporaryRecording(file) {
    if (file?.path) {
        await fs.promises.unlink(file.path).catch(() => null);
    }
}

async function uploadInterviewRecording(req, res) {
    let file;
    let userId;
    let jobId;

    try {
        file = getUploadedRecordingFile(req);
        userId = req.body?.userId;
        jobId = req.body?.jobId;

        if (!file) {
            return res.status(400).json({ error: "No interview recording file provided" });
        }

        if (!userId || !jobId) {
            return res.status(400).json({ error: "userId and jobId are required" });
        }

        const existingApplication = await Application.findOne({ userId, jobId }).lean();
        const recordingSessionId =
            req.body?.recordingSessionId ||
            existingApplication?.recordingSessionId ||
            buildRecordingSessionId(userId, jobId);

        const uploadResult = await uploadRecordingToCloudinary(file, {
            resource_type: "video",
            folder: "ai-interviews",
            public_id: recordingSessionId,
            use_filename: false,
            unique_filename: false,
            overwrite: true,
            type: "upload",
            tags: [
                "ai-interview",
                `user-${sanitizeRecordingSegment(userId)}`,
                `job-${sanitizeRecordingSegment(jobId)}`
            ],
            context: {
                alt: `Interview recording for ${userId}`,
                caption: `Interview recording ${recordingSessionId}`
            }
        });

        const playbackUrl = buildPlaybackUrl(uploadResult.public_id);

        await Application.findOneAndUpdate(
            { userId, jobId },
            {
                recordingSessionId,
                recordingStatus: "uploaded",
                recordingPublicId: uploadResult.public_id,
                recordingAssetId: uploadResult.asset_id,
                recordingUrl: uploadResult.secure_url,
                recordingPlaybackUrl: playbackUrl,
                recordingFormat: uploadResult.format,
                recordingDuration: uploadResult.duration,
                recordingBytes: uploadResult.bytes || file.size,
                recordingUploadedAt: new Date()
            },
            { upsert: true, new: true }
        );

        res.status(200).json({
            success: true,
            recordingSessionId,
            public_id: uploadResult.public_id,
            asset_id: uploadResult.asset_id,
            secure_url: uploadResult.secure_url,
            playback_url: playbackUrl,
            message: "Interview recording uploaded successfully",
            cloudinary_folder: "ai-interviews",
            resource_type: uploadResult.resource_type
        });
    } catch (error) {
        if (userId && jobId) {
            await Application.findOneAndUpdate(
                { userId, jobId },
                { recordingStatus: "upload_failed" },
                { upsert: true }
            ).catch(() => null);
        }

        console.error("[UPLOAD-RECORDING] Error:", error);
        res.status(500).json({
            error: "Upload failed",
            message: error.message
        });
    } finally {
        await cleanupTemporaryRecording(file);
    }
}

router.get("/interview-details/:applicationId", getInterviewDetails);

router.post(
    ["/upload-recording", "/interview/upload-recording"],
    recordingUpload.fields([
        { name: "recording", maxCount: 1 },
        { name: "audio", maxCount: 1 }
    ]),
    uploadInterviewRecording
);

module.exports = router;
