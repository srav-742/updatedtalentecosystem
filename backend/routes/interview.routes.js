const express = require("express");
const router = express.Router();
const upload = require("../config/multer");
const cloudinary = require("../config/cloudinary");
const streamifier = require("streamifier");
const Application = require("../models/Application");

// ✅ STEP 6 — Create Upload API
router.post("/upload-recording", upload.single("audio"), async (req, res) => {
    try {
        const { userId, jobId } = req.body;

        if (!req.file) {
            return res.status(400).json({ error: "No audio file provided" });
        }

        const streamUpload = () => {
            return new Promise((resolve, reject) => {
                const stream = cloudinary.uploader.upload_stream(
                    {
                        resource_type: "video",
                        folder: "ai-interviews",
                        type: "private"
                    },
                    (error, result) => {
                        if (result) resolve(result);
                        else reject(error);
                    }
                );

                streamifier.createReadStream(req.file.buffer).pipe(stream);
            });
        };

        const result = await streamUpload();

        // ✅ STEP 7 — Store Only Metadata in MongoDB
        if (userId && jobId) {
            await Application.findOneAndUpdate(
                { userId, jobId },
                { recordingPublicId: result.public_id },
                { upsert: true }
            );
        }

        res.status(200).json({
            success: true,
            public_id: result.public_id,
        });

    } catch (error) {
        console.error("Cloudinary Upload Error:", error);
        res.status(500).json({ error: "Upload failed" });
    }
});

module.exports = router;
