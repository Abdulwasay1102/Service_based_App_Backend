const multer = require("multer");

// Keep files in memory; controller uploads them to Cloudinary (if configured)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

module.exports = upload;
