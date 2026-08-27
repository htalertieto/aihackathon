const multer = require('multer');

// Keep uploads in memory only — no PHI written to disk.
const storage = multer.memoryStorage();

const limits = {
  fileSize: 15 * 1024 * 1024, // 15MB
};

const upload = multer({ storage, limits });

module.exports = upload;
