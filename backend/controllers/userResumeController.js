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

        // 1. Upload file to Cloudinary as 'raw' (always using 'raw' to avoid PDF delivery security restrictions)
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
        let text = "";
        try {
            const pdfData = await pdf(req.file.buffer);
            text = (pdfData?.text || "").trim();
        } catch (pdfError) {
            console.warn("[PDF-PARSE-WARNING]: Failed to parse PDF structure, trying fallback UTF-8 conversion:", pdfError.message);
            const rawString = req.file.buffer.toString('utf8');
            if (rawString && rawString.trim().length > 10) {
                text = rawString;
            } else {
                throw pdfError;
            }
        }

        // 3. Mark all other resumes for this user as not default
        await UserResume.updateMany({ userId }, { isDefault: false });

        // 4. Create new UserResume record
        const newResume = new UserResume({
            userId,
            title: req.file.originalname.replace('.pdf', '') || 'Uploaded Resume',
            source: 'upload',
            cloudinaryUrl: uploadResult.secure_url,
            fileName: req.file.originalname,
            isDefault: true
        });
        await newResume.save();

        // 5. Build dynamic proxy URL using request host
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const proxyUrl = `${baseUrl}/api/user-resumes/view/${newResume._id}`;

        newResume.fileUrl = proxyUrl;
        await newResume.save();

        // 6. Update user's profile resumeUrl
        const User = require('../models/User');
        await User.findOneAndUpdate(
            {
                $or: [
                    { uid: userId },
                    { _id: require('mongoose').Types.ObjectId.isValid(userId) ? userId : null }
                ]
            },
            { resumeUrl: proxyUrl }
        );

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

const viewResumeFile = async (req, res) => {
    try {
        const { id } = req.params;
        const resume = await UserResume.findById(id);
        if (!resume) {
            return res.status(404).json({ message: "Resume not found" });
        }

        const targetUrl = resume.cloudinaryUrl || resume.fileUrl;
        if (!targetUrl) {
            return res.status(400).json({ message: "No source file URL found" });
        }

        console.log(`[PROXY] Fetching resume from Cloudinary: ${targetUrl}`);
        const axios = require('axios');
        const response = await axios({
            method: 'get',
            url: targetUrl,
            responseType: 'arraybuffer'
        });

        const isPdf = resume.fileName?.toLowerCase().endsWith('.pdf') || targetUrl.toLowerCase().endsWith('.pdf');
        const contentType = isPdf ? 'application/pdf' : 'application/octet-stream';

        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `inline; filename="${resume.fileName || 'resume'}"`);
        res.send(response.data);
    } catch (error) {
        console.error("[PROXY-ERROR]:", error);
        res.status(500).json({ message: "Failed to load resume file", error: error.message });
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

        // Sync with User profile's resumeUrl
        if (updated.fileUrl) {
            const User = require('../models/User');
            await User.findOneAndUpdate(
                {
                    $or: [
                        { uid: userId },
                        { _id: require('mongoose').Types.ObjectId.isValid(userId) ? userId : null }
                    ]
                },
                { resumeUrl: updated.fileUrl }
            );
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

        // If the deleted resume was the default one, clear User.resumeUrl or fallback
        if (deleted.isDefault) {
            const User = require('../models/User');
            const nextResume = await UserResume.findOne({ userId: deleted.userId }).sort({ createdAt: -1 });
            if (nextResume) {
                nextResume.isDefault = true;
                await nextResume.save();
                await User.findOneAndUpdate(
                    {
                        $or: [
                            { uid: deleted.userId },
                            { _id: require('mongoose').Types.ObjectId.isValid(deleted.userId) ? deleted.userId : null }
                        ]
                    },
                    { resumeUrl: nextResume.fileUrl }
                );
            } else {
                await User.findOneAndUpdate(
                    {
                        $or: [
                            { uid: deleted.userId },
                            { _id: require('mongoose').Types.ObjectId.isValid(deleted.userId) ? deleted.userId : null }
                        ]
                    },
                    { resumeUrl: '' }
                );
            }
        }

        res.json({ success: true, message: "Resume deleted successfully" });
    } catch (error) {
        console.error("[USER-RESUME-DELETE-ERROR]:", error);
        res.status(500).json({ message: "Failed to delete resume", error: error.message });
    }
};

module.exports = { uploadResume, getUserResumes, setDefaultResume, deleteResume, viewResumeFile };
