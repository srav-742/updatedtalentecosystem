const UserResume = require('../models/UserResume');
const cloudinary = require('../config/cloudinary');
const pdf = require('pdf-parse');

const uploadResume = async (req, res) => {
    try {
        const { userId } = req.body;
        if (!userId) {
            return res.status(400).json({ message: "User ID is required" });
        }
        if (!req.file) {
            return res.status(400).json({ message: "No resume file uploaded" });
        }

        // 1. Upload raw file to Cloudinary
        const uploadResult = await new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                { 
                    folder: 'candidate-resumes', 
                    resource_type: 'raw',
                    public_id: `resume_${userId}_${Date.now()}` 
                },
                (error, result) => {
                    if (error) {
                        console.error("[CLOUDINARY-UPLOAD-ERROR]:", error);
                        reject(error);
                    }
                    else resolve(result);
                }
            );
            uploadStream.end(req.file.buffer);
        });

        // 2. Parse PDF buffer using pdf-parse to extract text
        const pdfData = await pdf(req.file.buffer);
        const text = (pdfData?.text || "").trim();

        const isMlOps = req.file.originalname.toLowerCase().includes('mlops');
        let newResume = null;

        if (!isMlOps) {
            // 3. Mark all other resumes for this user as not default
            await UserResume.updateMany({ userId }, { isDefault: false });

            // 4. Create new UserResume record
            newResume = await UserResume.create({
                userId,
                title: req.file.originalname.replace('.pdf', '') || 'Uploaded Resume',
                source: 'upload',
                fileUrl: uploadResult.secure_url,
                fileName: req.file.originalname,
                isDefault: true
            });
        }

        res.status(201).json({
            success: true,
            resume: newResume,
            extractedText: text
        });
    } catch (error) {
        console.error("[USER-RESUME-UPLOAD-ERROR]:", error);
        res.status(500).json({ message: "Failed to upload and process resume", error: error.message });
    }
};

const getUserResumes = async (req, res) => {
    try {
        const { userId } = req.params;
        const resumes = await UserResume.find({ userId }).sort({ createdAt: -1 });
        res.json(resumes);
    } catch (error) {
        console.error("[USER-RESUMES-GET-ERROR]:", error);
        res.status(500).json({ message: "Failed to fetch resumes", error: error.message });
    }
};

const setDefaultResume = async (req, res) => {
    try {
        const { id } = req.params;
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({ message: "User ID is required" });
        }

        await UserResume.updateMany({ userId }, { isDefault: false });
        const updated = await UserResume.findByIdAndUpdate(id, { isDefault: true }, { new: true });
        
        if (!updated) {
            return res.status(404).json({ message: "Resume not found" });
        }

        res.json({ success: true, resume: updated });
    } catch (error) {
        console.error("[USER-RESUME-SET-DEFAULT-ERROR]:", error);
        res.status(500).json({ message: "Failed to set default resume", error: error.message });
    }
};

const deleteResume = async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await UserResume.findByIdAndDelete(id);
        
        if (!deleted) {
            return res.status(404).json({ message: "Resume not found" });
        }

        res.json({ success: true, message: "Resume deleted successfully" });
    } catch (error) {
        console.error("[USER-RESUME-DELETE-ERROR]:", error);
        res.status(500).json({ message: "Failed to delete resume", error: error.message });
    }
};

module.exports = { uploadResume, getUserResumes, setDefaultResume, deleteResume };
