const express = require("express");
const router = express.Router();
const upload = require("../config/multer");
const cloudinary = require("../config/cloudinary");
const streamifier = require("streamifier");
const Application = require("../models/Application");
const { getInterviewDetails } = require("../controllers/interviewController");

// ✅ GET Interview Details for Recruiter Page (mounted at /api/interview-details)
router.get("/interview-details/:applicationId", getInterviewDetails);

// ✅ Upload Recording (mounted at /api/interview/upload-recording)
router.post("/upload-recording", upload.single("audio"), async (req, res) => {
    try {
        const { userId, jobId } = req.body;

        if (!req.file) {
            return res.status(400).json({ error: "No audio/video file provided" });
        }

        if (!userId || !jobId) {
            return res.status(400).json({ error: "userId and jobId are required" });
        }

        const streamUpload = () => {
            return new Promise((resolve, reject) => {
                const stream = cloudinary.uploader.upload_stream(
                    {
                        resource_type: "video",
                        folder: "ai-interviews",
                        type: "private",
                        chunk_size: 6 * 1024 * 1024,
                        eager_async: true
                    },
                    (error, result) => {
                        if (result) {
                            resolve(result);
                        } else {
                            reject(error);
                        }
                    }
                );

                streamifier.createReadStream(req.file.buffer).pipe(stream);
            });
        };

        const result = await streamUpload();

        const updateResult = await Application.findOneAndUpdate(
            { userId, jobId },
            {
                recordingPublicId: result.public_id,
                recordingUrl: result.secure_url
            },
            { upsert: true, new: true }
        );

        res.status(200).json({
            success: true,
            public_id: result.public_id,
            secure_url: result.secure_url,
            message: "Recording uploaded successfully"
        });

    } catch (error) {
        console.error("[UPLOAD-RECORDING] Error:", error);
        res.status(500).json({
            error: "Upload failed",
            message: error.message
        });
    }
});

module.exports = router;
