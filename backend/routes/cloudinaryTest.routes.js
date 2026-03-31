const express = require("express");
const router = express.Router();
const cloudinary = require("../config/cloudinary");

/**
 * Test route to verify Cloudinary configuration and list uploaded interview videos
 * GET /api/cloudinary-test/status
 * GET /api/cloudinary-test/list-interviews
 */

// Check Cloudinary configuration status
router.get("/status", async (req, res) => {
    try {
        const config = {
            cloud_name: process.env.CLOUDINARY_CLOUD_NAME ? "✓ Set" : "✗ Missing",
            api_key: process.env.CLOUDINARY_API_KEY ? "✓ Set" : "✗ Missing",
            api_secret: process.env.CLOUDINARY_API_SECRET ? "✓ Set" : "✗ Missing"
        };

        res.json({
            success: true,
            cloudinary_config: config,
            message: "Cloudinary configuration check completed"
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// List all videos in the ai-interviews folder
router.get("/list-interviews", async (req, res) => {
    try {
        const result = await cloudinary.api.resources({
            type: "upload",
            prefix: "ai-interviews/",
            resource_type: "video",
            max_results: 100
        });

        res.json({
            success: true,
            total_videos: result.resources.length,
            videos: result.resources.map(video => ({
                public_id: video.public_id,
                secure_url: video.secure_url,
                created_at: video.created_at,
                format: video.format,
                bytes: video.bytes,
                duration: video.duration,
                type: video.type,
                folder: video.folder,
                // Direct playable URL for dashboard
                playable_url: video.secure_url
            }))
        });
    } catch (error) {
        console.error("[CLOUDINARY-LIST-ERROR]:", error);
        res.status(500).json({
            success: false,
            error: error.message,
            message: "Failed to fetch videos from Cloudinary"
        });
    }
});

// Get video details by public_id
router.get("/video/:publicId", async (req, res) => {
    try {
        const { publicId } = req.params;

        const result = await cloudinary.api.resource(publicId, {
            resource_type: "video"
        });

        res.json({
            success: true,
            video: {
                public_id: result.public_id,
                secure_url: result.secure_url,
                created_at: result.created_at,
                format: result.format,
                bytes: result.bytes,
                duration: result.duration,
                type: result.type,
                folder: result.folder
            }
        });
    } catch (error) {
        console.error("[CLOUDINARY-VIDEO-DETAILS-ERROR]:", error);
        res.status(404).json({
            success: false,
            error: error.message,
            message: "Video not found or access denied"
        });
    }
});

module.exports = router;
