const fs = require("fs");
const path = require("path");

const INTERVIEWS_DIR = path.join(__dirname, "../private_storage/interviews");

// List all interview folders
const listInterviews = (req, res) => {
    try {
        if (!fs.existsSync(INTERVIEWS_DIR)) {
            return res.json([]);
        }

        const entries = fs.readdirSync(INTERVIEWS_DIR);
        const folders = entries.filter(name => {
            const fullPath = path.join(INTERVIEWS_DIR, name);
            return fs.lstatSync(fullPath).isDirectory();
        });

        const orphanFiles = entries.filter(name => {
            const fullPath = path.join(INTERVIEWS_DIR, name);
            return fs.lstatSync(fullPath).isFile() && name.endsWith('.webm');
        });

        // Map folders to some metadata if needed (e.g. file count)
        const folderData = folders.map(id => {
            const folderPath = path.join(INTERVIEWS_DIR, id);
            const files = fs.readdirSync(folderPath);
            return {
                id,
                fileCount: files.length,
                lastModified: fs.statSync(folderPath).mtime
            };
        });

        if (orphanFiles.length > 0) {
            folderData.push({
                id: 'Other Recordings',
                fileCount: orphanFiles.length,
                lastModified: fs.statSync(INTERVIEWS_DIR).mtime,
                isVirtual: true
            });
        }

        res.json(folderData);
    } catch (error) {
        console.error("Error listing interviews:", error);
        res.status(500).json({ message: "Error listing interviews" });
    }
};

// List audio files for a specific interview
const listInterviewFiles = (req, res) => {
    try {
        const { id } = req.params;
        // Basic path traversal protection
        if (id.includes("..")) {
            return res.status(400).json({ message: "Invalid request" });
        }

        if (id === 'Other Recordings') {
            const entries = fs.readdirSync(INTERVIEWS_DIR);
            const orphanFiles = entries.filter(name => {
                const fullPath = path.join(INTERVIEWS_DIR, name);
                return fs.lstatSync(fullPath).isFile() && name.endsWith('.webm');
            });
            return res.json(orphanFiles);
        }

        const folderPath = path.join(INTERVIEWS_DIR, id);

        if (!fs.existsSync(folderPath)) {
            return res.status(404).json({ message: "Interview not found" });
        }

        const files = fs.readdirSync(folderPath);
        res.json(files);
    } catch (error) {
        console.error("Error listing interview files:", error);
        res.status(500).json({ message: "Error listing files" });
    }
};

// Stream audio file securely
const streamAudio = (req, res) => {
    try {
        const { interviewId, fileName } = req.params;

        // Path traversal protection
        if (interviewId.includes("..") || fileName.includes("..")) {
            return res.status(400).json({ message: "Invalid request" });
        }

        let filePath;
        if (interviewId === 'Other Recordings') {
            filePath = path.join(INTERVIEWS_DIR, fileName);
        } else {
            filePath = path.join(INTERVIEWS_DIR, interviewId, fileName);
        }

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ message: "File not found" });
        }

        res.setHeader("Content-Type", "audio/webm");
        res.sendFile(filePath);
    } catch (error) {
        console.error("Error streaming audio:", error);
        res.status(500).json({ message: "Error streaming audio" });
    }
};

module.exports = {
    listInterviews,
    listInterviewFiles,
    streamAudio
};
