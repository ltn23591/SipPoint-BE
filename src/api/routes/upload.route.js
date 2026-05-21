const express = require('express');
const multer = require('multer');
const UploadController = require('../../controllers/upload.controller');
const { protect } = require('../../middleware/auth.middleware');

const router = express.Router();

// Dùng diskStorage cho Local Upload
const uploadLocal = require('../../middleware/upload.middleware');

// Dùng memoryStorage cho Cloudinary
const uploadMemory = multer({ storage: multer.memoryStorage() });

router.post('/local', protect, uploadLocal.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'Vui lòng chọn một file ảnh' });
  }

  res.status(200).json({
    success: true,
    message: 'Tải file thành công',
    data: {
      url: `/uploads/${req.file.filename}`
    }
  });
});

router.post('/cloudinary/url', protect, UploadController.uploadFromUrl);

router.post('/cloudinary/file', protect, uploadMemory.single('file'), UploadController.uploadFromFile);

module.exports = router;
