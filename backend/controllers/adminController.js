const fs = require("fs");
const path = require("path");

const INTERVIEWS_DIR = path.join(__dirname, "../private_storage/interviews");

// List all interview folders
const listInterviews = (req, res) => {
    try {
        if (!fs.existsSync(INTERVIEWS_DIR)) {
            return res.json([]);
        }
        const interviewFolders = fs.readdirSync(INTERVIEWS_DIR);
        res.json(interviewFolders);
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

        const filePath = path.join(INTERVIEWS_DIR, interviewId, fileName);

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
