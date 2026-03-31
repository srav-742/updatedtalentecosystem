const multer = require("multer");

const storage = multer.memoryStorage();

const upload = multer({
    storage,
    // Full interview recordings can be significantly larger than single-answer uploads.
    limits: { fileSize: 200 * 1024 * 1024 }, // 200MB
});

module.exports = upload;
