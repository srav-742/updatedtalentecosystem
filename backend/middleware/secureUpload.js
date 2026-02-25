const multer = require("multer");
const fs = require("fs");
const path = require("path");

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // The interviewId should be passed in the body
        const interviewId = req.body.interviewId || 'unknown';
        const folderPath = path.join(__dirname, "../private_storage/interviews", interviewId);

        if (!fs.existsSync(folderPath)) {
            fs.mkdirSync(folderPath, { recursive: true });
        }

        cb(null, folderPath);
    },
    filename: function (req, file, cb) {
        const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}.webm`;
        cb(null, uniqueName);
    }
});

const secureUpload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

module.exports = secureUpload;
