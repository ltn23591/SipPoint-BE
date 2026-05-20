const express = require('express');
const multer = require('multer');
const CloudinaryController = require('../../controllers/cloudinary.controller');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

/**
 * @swagger
 * tags:
 *   name: Cloudinary
 *   description: API upload ảnh lên Cloudinary
 */

/**
 * @swagger
 * /api/v1/cloudinary/upload-url:
 *   post:
 *     summary: Upload ảnh từ URL lên Cloudinary
 *     tags: [Cloudinary]
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
router.post('/upload-url', CloudinaryController.uploadFromUrl);

/**
 * @swagger
 * /api/v1/cloudinary/upload-file:
 *   post:
 *     summary: Upload ảnh từ file lên Cloudinary
 *     tags: [Cloudinary]
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
router.post('/upload-file', upload.single('file'), CloudinaryController.uploadFromFile);

module.exports = router;
