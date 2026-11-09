const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cloudinary = require('../config/cloudinary');
const Application = require('../models/Application');
const mongoose = require('mongoose');

const tempDir = path.join(__dirname, '..', 'private_storage', 'video-intros-temp');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }
        cb(null, tempDir);
    },
    filename: (req, file, cb) => {
        cb(null, `intro-${Date.now()}-${file.originalname}`);
    }
});

const upload = multer({ 
    storage,
    limits: { fileSize: 100 * 1024 * 1024 } // 100MB max
});

router.post('/upload-video-intro', upload.single('video'), async (req, res) => {
    let failureStage = 'cloudinary_upload';

    try {
        const { userId, jobId } = req.body;
        const file = req.file;

        if (!file || !userId || !jobId) {
            return res.status(400).json({ message: "Missing required fields (video, userId, jobId)" });
        }

        const uploadResult = await new Promise((resolve, reject) => {
            cloudinary.uploader.upload_large(file.path, {
                resource_type: "video",
                folder: "candidate-intros",
                public_id: `intro_${userId}_${jobId}_${Date.now()}`,
                overwrite: true,
                chunk_size: 6000000
            }, (error, result) => {
                if (error) return reject(error);
                resolve(result);
            });
        });

        // Cleanup local file
        failureStage = 'local_cleanup';
        fs.unlinkSync(file.path);

        failureStage = 'application_save';
        const application = await Application.findOneAndUpdate(
            { jobId: new mongoose.Types.ObjectId(jobId), userId },
            { 
                videoIntroUrl: uploadResult.secure_url,
                videoIntroPublicId: uploadResult.public_id
            },
            { new: true, upsert: true }
        );

        try {
            const { invalidateCache } = require('../middleware/cacheMiddleware');
            invalidateCache('/api/applications');
        } catch (cacheErr) {
            // ignore
        }

        res.status(200).json({
            success: true,
            videoUrl: uploadResult.secure_url,
            application
        });

    } catch (error) {
        const diagnostic = {
            stage: failureStage,
            name: error?.name,
            httpCode: error?.http_code || error?.statusCode,
            message: error?.message || 'Unknown upload error'
        };
        console.error("[VIDEO-INTRO-UPLOAD] Error:", diagnostic);
        res.status(500).json({ message: "Internal Server Error", error: diagnostic.message });
    }
});

module.exports = router;
