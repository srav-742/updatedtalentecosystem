const express = require("express");
const router = express.Router();
const upload = require("../config/multer");
const cloudinary = require("../config/cloudinary");
const streamifier = require("streamifier");
const isAdmin = require("../middleware/adminAuth");
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

// ✅ STEP 8 — Admin Secure Access
router.get("/admin/applicants", isAdmin, async (req, res) => {
    try {
        const apps = await Application.find({ recordingPublicId: { $exists: true, $ne: null } })
            .sort({ appliedAt: -1 });
        res.json(apps);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch applicants" });
    }
});

router.get("/admin/recording/:publicId", isAdmin, async (req, res) => {
    try {
        const publicId = req.params.publicId;

        const url = cloudinary.url(publicId, {
            resource_type: "video",
            type: "private",
            sign_url: true,
            expires_at: Math.floor(Date.now() / 1000) + 60 * 5
        });

        res.json({ url });
    } catch (error) {
        res.status(500).json({ error: "Failed to generate signed URL" });
    }
});

module.exports = router;
