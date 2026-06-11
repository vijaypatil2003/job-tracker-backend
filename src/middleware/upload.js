const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { AppError } = require('../utils/AppError');

// Ensure upload directories exist
const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};

// Resume storage
const resumeStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = process.env.FILE_UPLOAD_PATH || './uploads/resumes';
    ensureDir(dir);
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const filename = `resume_${req.user.id}_${uuidv4()}${ext}`;
    cb(null, filename);
  },
});

// Avatar storage
const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = './uploads/avatars';
    ensureDir(dir);
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `avatar_${req.user.id}${ext}`);
  },
});

// Import file storage (CSV/XLSX — temp)
const importStorage = multer.memoryStorage();

// File filter
const resumeFilter = (req, file, cb) => {
  const allowed = ['.pdf', '.doc', '.docx'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) return cb(null, true);
  cb(new AppError('Only PDF, DOC, and DOCX files are allowed for resumes.', 400), false);
};

const imageFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) return cb(null, true);
  cb(new AppError('Only image files are allowed for avatars.', 400), false);
};

const importFilter = (req, file, cb) => {
  const allowed = ['text/csv', 'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
  if (allowed.includes(file.mimetype)) return cb(null, true);
  cb(new AppError('Only CSV or Excel files are allowed for import.', 400), false);
};

const MAX_SIZE = parseInt(process.env.MAX_FILE_UPLOAD) || 5 * 1024 * 1024;

const uploadResume = multer({
  storage: resumeStorage,
  limits: { fileSize: MAX_SIZE },
  fileFilter: resumeFilter,
});

const uploadAvatar = multer({
  storage: avatarStorage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: imageFilter,
});

const uploadImport = multer({
  storage: importStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: importFilter,
});

module.exports = { uploadResume, uploadAvatar, uploadImport };
