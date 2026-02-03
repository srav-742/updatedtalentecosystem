const multer = require('multer');
const fs = require('fs-extra');
const path = require('path');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = './uploads';
        if (!fs.existsSync(dir)) fs.mkdirSync(dir);
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        cb(null, `audio_${Date.now()}.wav`);
    }
});

const upload = multer({ storage });

const memoryUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 15 * 1024 * 1024 } // 15 MB
});

module.exports = { upload, memoryUpload };
