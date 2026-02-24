const express = require('express');
const router = express.Router();
const multer = require('multer');
const { authenticate, authorize } = require('../middleware/auth');
const { AppError } = require('../middleware/errorHandler');
const { uploadToStorage } = require('../config/storage');

// ─── MULTER CONFIGURATION (memory storage for Supabase) ───

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/svg+xml',
    'application/pdf',
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppError(`File type ${file.mimetype} is not allowed`, 400), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

// ─── ROUTES ───────────────────────────────────────────────

// POST /api/upload — single file upload
router.post('/', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'MANAGER'), upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      throw new AppError('No file uploaded', 400);
    }

    const publicUrl = await uploadToStorage(req.file, 'general');

    res.status(201).json({
      success: true,
      data: {
        url: publicUrl,
        filename: req.file.originalname,
        originalName: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/upload/multiple — multiple file upload (up to 10)
router.post('/multiple', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'MANAGER'), upload.array('files', 10), async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      throw new AppError('No files uploaded', 400);
    }

    const files = await Promise.all(
      req.files.map(async (file) => {
        const publicUrl = await uploadToStorage(file, 'general');
        return {
          url: publicUrl,
          filename: file.originalname,
          originalName: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
        };
      })
    );

    res.status(201).json({ success: true, data: files });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
