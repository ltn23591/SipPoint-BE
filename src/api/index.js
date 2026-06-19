const express = require('express');
const employeeRoutes = require('./routes/employee.route');
const authRoutes = require('./routes/auth.route');
const uploadRoutes = require('./routes/upload.route');
const exportRoutes = require('./routes/export.route');
const productRoutes = require('./routes/product.route');
const categoryRoutes = require('./routes/category.route');
const customerRoutes = require('./routes/customer.route');
const customerRankRoutes = require('./routes/customerRank.route');
const voucherRoutes = require('./routes/voucher.route');
const zoneRoutes = require('./routes/zone.route');
const tableRoutes = require('./routes/table.route');
const orderRoutes = require('./routes/order.route');
const storeRoutes = require('./routes/store.route');
const staffRoleRoutes = require('./routes/staffRole.route');
const productPriceRoutes = require('./routes/productPrice.route');
const membershipProgramRoutes = require('./routes/membershipProgram.route');
const membershipTierRoutes = require('./routes/membershipTier.route');
const promotionProgramRoutes = require('./routes/promotionProgram.route');
const notificationRoutes = require('./routes/notification.route');
const feedbackRoutes = require('./routes/feedback.route');
const activityLogRoutes = require('./routes/activityLog.route');
const documentRoutes = require('./routes/document.route');
const reportRoutes = require('./routes/report.route');
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
router.use('/employees', employeeRoutes);
router.use('/upload', uploadRoutes);
router.use('/export', exportRoutes);
router.use('/products', productRoutes);
router.use('/categories', categoryRoutes);
router.use('/customers', customerRoutes);
router.use('/customer-ranks', customerRankRoutes);
router.use('/vouchers', voucherRoutes);
router.use('/zones', zoneRoutes);
router.use('/tables', tableRoutes);
router.use('/orders', orderRoutes);
router.use('/store', storeRoutes);
router.use('/staff/role', staffRoleRoutes);
router.use('/product-price', productPriceRoutes);
router.use('/membership-program', membershipProgramRoutes);
router.use('/membership-tier', membershipTierRoutes);
router.use('/promotion-program', promotionProgramRoutes);
router.use('/notification', notificationRoutes);
router.use('/feedback', feedbackRoutes);
router.use('/activity-log', activityLogRoutes);
router.use('/document', documentRoutes);
router.use('/report', reportRoutes);

module.exports = router;
