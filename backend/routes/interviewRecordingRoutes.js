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
const chunksDir = path.join(__dirname, "..", "private_storage", "temp_chunks");

// Ensure directories exist
fs.mkdirSync(tempRecordingDir, { recursive: true });
fs.mkdirSync(chunksDir, { recursive: true });

const recordingUpload = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => {
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

const chunkUpload = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => {
            const sessionId = req.body.sessionId || "unknown";
            const sessionDir = path.join(chunksDir, sessionId);
            fs.mkdirSync(sessionDir, { recursive: true });
            cb(null, sessionDir);
        },
        filename: (req, file, cb) => {
            const chunkIndex = req.body.chunkIndex || "0";
            cb(null, `part_${chunkIndex.padStart(5, '0')}.webm`);
        }
    })
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
    // Use upload_large for file paths — supports files of any size via 6MB chunked streaming.
    // This prevents Cloudinary's standard upload size limit (100MB) from rejecting long interviews.
    if (typeof file === 'string') {
        return cloudinary.uploader.upload_large(file, { ...options, chunk_size: 6000000 });
    }
    if (file?.path) {
        return cloudinary.uploader.upload_large(file.path, { ...options, chunk_size: 6000000 });
    }

    // Fallback for in-memory buffers — use upload_stream (no chunked alternative for buffers)
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
    if (typeof file === 'string') {
        await fs.promises.unlink(file).catch(() => null);
    } else if (file?.path) {
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
                recordingBytes: uploadResult.bytes || (typeof file === 'string' ? 0 : file.size),
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

// --- NEW CHUNKED RECORDING ENDPOINTS ---

router.post("/upload-recording-chunk", chunkUpload.single("chunk"), (req, res) => {
    res.status(200).json({ success: true, message: "Chunk uploaded" });
});

router.post("/finalize-recording", async (req, res) => {
    const { sessionId, userId, jobId } = req.body;

    if (!sessionId || !userId || !jobId) {
        return res.status(400).json({ error: "sessionId, userId, and jobId are required" });
    }

    const sessionDir = path.join(chunksDir, sessionId);
    if (!fs.existsSync(sessionDir)) {
        return res.status(404).json({ error: "Recording chunks not found" });
    }

    const chunkFiles = fs.readdirSync(sessionDir).sort();
    if (chunkFiles.length === 0) {
        return res.status(400).json({ error: "No chunks found to finalize" });
    }

    // ── ASYNC FINALIZATION ────────────────────────────────────────────────
    // Respond immediately so the frontend (and Render's 100s timeout) are
    // never blocked.  Merging + Cloudinary upload happen in the background.
    // ─────────────────────────────────────────────────────────────────────
    res.status(200).json({
        success: true,
        recordingSessionId: sessionId,
        message: "Recording finalization started — upload will complete in the background."
    });

    // Background: merge chunks → upload_large → update MongoDB
    (async () => {
        let mergedFilePath;
        try {
            console.log(`[FINALIZE-BG] Starting background merge for session: ${sessionId} (${chunkFiles.length} chunks)`);

            mergedFilePath = path.join(tempRecordingDir, `${sessionId}_merged.webm`);
            const writeStream = fs.createWriteStream(mergedFilePath);

            for (const file of chunkFiles) {
                const filePath = path.join(sessionDir, file);
                const chunkData = fs.readFileSync(filePath);
                writeStream.write(chunkData);
            }
            writeStream.end();
            await new Promise((resolve) => writeStream.on('finish', resolve));

            const mergedStats = fs.statSync(mergedFilePath);
            console.log(`[FINALIZE-BG] Merged file size: ${(mergedStats.size / (1024 * 1024)).toFixed(1)} MB`);

            // Determine recordingSessionId
            const existingApp = await Application.findOne({ userId, jobId }).lean();
            const recordingSessionId =
                existingApp?.recordingSessionId ||
                buildRecordingSessionId(userId, jobId);

            // Upload via upload_large (chunked, no size limit)
            const uploadResult = await uploadRecordingToCloudinary(
                mergedFilePath,
                {
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
                }
            );

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
                    recordingBytes: uploadResult.bytes || mergedStats.size,
                    recordingUploadedAt: new Date()
                },
                { upsert: true, new: true }
            );

            console.log(`[FINALIZE-BG] Upload complete for session: ${sessionId} — ${uploadResult.secure_url}`);
        } catch (bgError) {
            console.error("[FINALIZE-BG] Background finalization failed:", bgError);
            await Application.findOneAndUpdate(
                { userId, jobId },
                { recordingStatus: "upload_failed" },
                { upsert: true }
            ).catch(() => null);
        } finally {
            // Cleanup merged file and chunk directory
            if (mergedFilePath) {
                fs.promises.unlink(mergedFilePath).catch(() => null);
            }
            fs.promises.rm(sessionDir, { recursive: true, force: true }).catch(() => null);
        }
    })();
});

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
