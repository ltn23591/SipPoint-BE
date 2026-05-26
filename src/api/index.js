const express = require('express');
const userRoutes = require('./routes/user.route');
const authRoutes = require('./routes/auth.route');
const uploadRoutes = require('./routes/upload.route');
const exportRoutes = require('./routes/export.route');
const productRoutes = require('./routes/product.route');
const categoryRoutes = require('./routes/category.route');
const aiRoutes = require('./routes/ai.route');
const router = express.Router();

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
router.use('/products', productRoutes);
router.use('/categories', categoryRoutes);
router.use('/ai', aiRoutes);

module.exports = router;
