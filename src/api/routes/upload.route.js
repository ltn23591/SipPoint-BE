const express = require('express');
const multer = require('multer');
const UploadController = require('../../controllers/upload.controller');
const { protect } = require('../../middleware/auth.middleware');

const router = express.Router();

// Dùng diskStorage cho Local Upload
const uploadLocal = require('../../middleware/upload.middleware');

// Dùng memoryStorage cho Cloudinary
const uploadMemory = multer({ storage: multer.memoryStorage() });

/**
 * @swagger
 * tags:
 *   name: Uploads
 *   description: API Upload File (Hỗ trợ Local & Cloudinary)
 */

/**
 * @swagger
 * /api/v1/upload/local:
 *   post:
 *     summary: Tải lên một hình ảnh (Lưu local)
 *     tags: [Uploads]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - image
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Tải lên thành công
 */
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

/**
 * @swagger
 * /api/v1/upload/cloudinary/url:
 *   post:
 *     summary: Upload ảnh từ URL lên Cloudinary
 *     tags: [Uploads]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - url
 *             properties:
 *               url:
 *                 type: string
 *                 description: URL của ảnh cần upload
 *               folder:
 *                 type: string
 *                 description: Thư mục lưu trữ trên Cloudinary (tùy chọn)
 *     responses:
 *       200:
 *         description: Upload thành công
 *       400:
 *         description: Thiếu URL
 */
router.post('/cloudinary/url', protect, UploadController.uploadFromUrl);

/**
 * @swagger
 * /api/v1/upload/cloudinary/file:
 *   post:
 *     summary: Upload ảnh từ file lên Cloudinary
 *     tags: [Uploads]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: File ảnh cần upload
 *               folder:
 *                 type: string
 *                 description: Thư mục lưu trữ trên Cloudinary (tùy chọn)
 *     responses:
 *       200:
 *         description: Upload thành công
 *       400:
 *         description: Thiếu file
 */
router.post('/cloudinary/file', protect, uploadMemory.single('file'), UploadController.uploadFromFile);

module.exports = router;
