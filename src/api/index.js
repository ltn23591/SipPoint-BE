const express = require('express');
const employeeRoutes = require('./routes/employee.route');
const authRoutes = require('./routes/auth.route');
const uploadRoutes = require('./routes/upload.route');
const exportRoutes = require('./routes/export.route');
const productRoutes = require('./routes/product.route');
const categoryRoutes = require('./routes/category.route');
const customerRoutes = require('./routes/customer.route');
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
const customerSegmentRoutes = require('./routes/customerSegment.route');
const campaignRoutes = require('./routes/campaign.route');
const notificationRoutes = require('./routes/notification.route');
const feedbackRoutes = require('./routes/feedback.route');
const activityLogRoutes = require('./routes/activityLog.route');
const documentRoutes = require('./routes/document.route');
const reportRoutes = require('./routes/report.route');
const shiftRoutes = require('./routes/shift.route');
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
router.use('/authen/portal', authRoutes); // Compatibility alias
router.use('/employees', employeeRoutes);
router.use('/staff', employeeRoutes); // Compatibility alias
router.use('/upload', uploadRoutes);
router.use('/export', exportRoutes);
router.use('/products', productRoutes);
router.use('/product', productRoutes); // Compatibility alias
router.use('/categories', categoryRoutes);
router.use('/product-category', categoryRoutes); // Compatibility alias
router.use('/customers', customerRoutes);
router.use('/customer', customerRoutes); // Compatibility alias
router.use('/vouchers', voucherRoutes);
router.use('/voucher', voucherRoutes); // Compatibility alias
router.use('/zones', zoneRoutes);
router.use('/tables', tableRoutes);
router.use('/table', tableRoutes); // Compatibility alias
router.use('/orders', orderRoutes);
router.use('/order', orderRoutes); // Compatibility alias
router.use('/store', storeRoutes);
router.use('/staff/role', staffRoleRoutes);
router.use('/product-price', productPriceRoutes);
router.use('/membership-program', membershipProgramRoutes);
router.use('/membership-tier', membershipTierRoutes);
router.use('/promotion-program', promotionProgramRoutes);
router.use('/customer-segments', customerSegmentRoutes);
router.use('/campaigns', campaignRoutes);
router.use('/notification', notificationRoutes);
router.use('/feedback', feedbackRoutes);
router.use('/activity-log', activityLogRoutes);
router.use('/document', documentRoutes);
router.use('/report', reportRoutes);
router.use('/shifts', shiftRoutes);
router.use('/shift', shiftRoutes); // Compatibility alias
router.use('/ai', aiRoutes);

module.exports = router;
