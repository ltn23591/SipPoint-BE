const express = require('express');
const upload = require('../../middleware/upload.middleware');
const { protect } = require('../../middleware/auth.middleware');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Uploads
 *   description: API Upload File
 */

/**
 * @swagger
 * /api/v1/upload:
 *   post:
 *     summary: Tải lên một hình ảnh
 *     tags: [Uploads]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Tải lên thành công
 */
router.post('/', protect, upload.single('image'), (req, res) => {
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

module.exports = router;
