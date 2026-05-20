const express = require('express');
const userRoutes = require('./routes/user.route');
const authRoutes = require('./routes/auth.route');
const uploadRoutes = require('./routes/upload.route');
const exportRoutes = require('./routes/export.route');
const cloudinaryRoutes = require('./routes/cloudinary.route');

const router = express.Router();

/**
 * @swagger
 * /api/v1/health:
 *   get:
 *     summary: Kiểm tra trạng thái hoạt động của Server (Health Check)
 *     tags: [System]
 *     responses:
 *       200:
 *         description: Server hoạt động bình thường
 */
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'Server hoạt động bình thường!',
    timestamp: new Date(),
  });
});

// Gắn các API Router
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/upload', uploadRoutes);
router.use('/export', exportRoutes);
router.use('/cloudinary', cloudinaryRoutes);

module.exports = router;
