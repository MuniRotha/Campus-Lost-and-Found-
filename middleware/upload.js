const multer = require('multer');
const path = require('path');
const crypto = require('crypto');

const MAX_BYTES = 2 * 1024 * 1024; // 2 MB
const TYPES = { 'image/jpeg': '.jpg', 'image/png': '.png' };

const storage = multer.diskStorage({
  destination: path.join(__dirname, '..', 'public', 'uploads'),
  // Server-generated name; the client's filename is never used.
  filename: (req, file, cb) =>
    cb(null, crypto.randomBytes(16).toString('hex') + TYPES[file.mimetype])
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_BYTES, files: 1 },
  fileFilter: (req, file, cb) => {
    if (!TYPES[file.mimetype]) return cb(new Error('INVALID_TYPE'));
    cb(null, true);
  }
}).single('image');

// Wrapper that turns multer errors into a user-friendly message on req.uploadError.
module.exports = function uploadImage(req, res, next) {
  upload(req, res, (err) => {
    if (err) {
      req.uploadError =
        err.code === 'LIMIT_FILE_SIZE' ? 'Image must be 2 MB or smaller.'
        : err.message === 'INVALID_TYPE' ? 'Only JPEG or PNG images are allowed.'
        : 'Image upload failed.';
    }
    next();
  });
};
