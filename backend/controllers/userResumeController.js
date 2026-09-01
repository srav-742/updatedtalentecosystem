const UserResume = require('../models/UserResume');
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

        // 1. Parse PDF buffer using pdf-parse to extract text
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

        // 2. Mark all other resumes for this user as not default
        await UserResume.updateMany({ userId }, { isDefault: false });

        // 3. Create new UserResume record — store PDF buffer directly in MongoDB
        const newResume = new UserResume({
            userId,
            title: req.file.originalname.replace('.pdf', '') || 'Uploaded Resume',
            source: 'upload',
            fileBuffer: req.file.buffer,
            fileMimeType: req.file.mimetype || 'application/pdf',
            fileName: req.file.originalname,
            isDefault: true
        });
        await newResume.save();

        // 4. Build dynamic proxy URL using request host
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

        const isPdf = resume.fileName?.toLowerCase().endsWith('.pdf');
        const contentType = resume.fileMimeType || (isPdf ? 'application/pdf' : 'application/octet-stream');

        // Serve from MongoDB buffer if available (new resumes)
        if (resume.fileBuffer && resume.fileBuffer.length > 0) {
            res.setHeader('Content-Type', contentType);
            res.setHeader('Content-Disposition', `inline; filename="${resume.fileName || 'resume'}"`);
            return res.send(resume.fileBuffer);
        }

        // Fallback: fetch from Cloudinary for old resumes stored before this change
        const targetUrl = resume.cloudinaryUrl || resume.fileUrl;
        if (!targetUrl) {
            return res.status(400).json({ message: "No source file URL found" });
        }

        console.log(`[PROXY] Fetching resume from Cloudinary (legacy): ${targetUrl}`);
        const axios = require('axios');
        const response = await axios({
            method: 'get',
            url: targetUrl,
            responseType: 'arraybuffer'
        });

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
        const mongoose = require('mongoose');
        const User = require('../models/User');

        const queryUsers = [userId];
        if (req.user?.uid) queryUsers.push(req.user.uid);
        if (req.user?._id) queryUsers.push(req.user._id.toString());

        // Also check if userId is a uid or _id in User model to link both
        if (userId) {
            const userDoc = await User.findOne({
                $or: [
                    { uid: userId },
                    { _id: mongoose.Types.ObjectId.isValid(userId) ? userId : null }
                ].filter(q => Object.values(q)[0] != null)
            }).select('uid _id').lean();
            if (userDoc) {
                if (userDoc.uid) queryUsers.push(userDoc.uid);
                if (userDoc._id) queryUsers.push(userDoc._id.toString());
            }
        }

        const uniqueUserIds = [...new Set(queryUsers.filter(Boolean))];
        const resumes = await UserResume.find({ userId: { $in: uniqueUserIds } }).sort({ createdAt: -1 });
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
        if (!id || id === 'undefined' || id === 'null') {
            return res.status(400).json({ message: "Invalid resume ID" });
        }

        const mongoose = require('mongoose');
        const User = require('../models/User');

        let deleted = null;
        if (mongoose.Types.ObjectId.isValid(id)) {
            deleted = await UserResume.findByIdAndDelete(id);
        }
        if (!deleted) {
            deleted = await UserResume.findOneAndDelete({
                $or: [
                    { _id: id },
                    { id: id }
                ]
            });
        }

        const userId = deleted?.userId || req.user?.uid || req.user?._id || req.headers['x-user-id'];

        // If the deleted resume was the default one, clear User.resumeUrl or fallback to next available
        if (deleted && deleted.isDefault) {
            const nextResume = await UserResume.findOne({ userId: deleted.userId }).sort({ createdAt: -1 });
            if (nextResume) {
                nextResume.isDefault = true;
                await nextResume.save();
                if (userId) {
                    await User.findOneAndUpdate(
                        {
                            $or: [
                                { uid: userId },
                                { _id: mongoose.Types.ObjectId.isValid(userId) ? userId : null }
                            ]
                        },
                        { resumeUrl: nextResume.fileUrl }
                    );
                }
            } else {
                if (userId) {
                    await User.findOneAndUpdate(
                        {
                            $or: [
                                { uid: userId },
                                { _id: mongoose.Types.ObjectId.isValid(userId) ? userId : null }
                            ]
                        },
                        { resumeUrl: '' }
                    );
                }
            }
        } else if (userId) {
            // Even if UserResume record was not found (already deleted), also clear User.resumeUrl if it points to it
            await User.findOneAndUpdate(
                {
                    $or: [
                        { uid: userId },
                        { _id: mongoose.Types.ObjectId.isValid(userId) ? userId : null }
                    ],
                    resumeUrl: new RegExp(id, 'i')
                },
                { resumeUrl: '' }
            );
        }

        res.json({ success: true, message: "Resume deleted successfully" });
    } catch (error) {
        console.error("[USER-RESUME-DELETE-ERROR]:", error);
        res.status(500).json({ message: "Failed to delete resume", error: error.message });
    }
};

module.exports = { uploadResume, getUserResumes, setDefaultResume, deleteResume, viewResumeFile };
