const express = require('express');
const FeedbackController = require('../../controllers/feedback.controller');
const { protect } = require('../../middleware/auth.middleware');
const { authorize } = require('../../middleware/authorize.middleware');
const { ROLE } = require('../../enums');

const router = express.Router();

// Public / Customer routes: gửi đánh giá đơn hàng & xem đánh giá của đơn hàng
router.post('/public', FeedbackController.create);
router.post('/', FeedbackController.create);
router.get('/order/:orderId', FeedbackController.getByOrder);

// Admin / Staff routes: tìm kiếm, chi tiết, phản hồi/cập nhật, xuất Excel
router.get('/', protect, authorize(ROLE.ADMIN, ROLE.CASHIER, ROLE.WAITER), FeedbackController.search);
router.post('/search', protect, authorize(ROLE.ADMIN, ROLE.CASHIER, ROLE.WAITER), FeedbackController.search);
router.get('/detail/:id', protect, authorize(ROLE.ADMIN, ROLE.CASHIER, ROLE.WAITER), FeedbackController.detail);
router.put('/update', protect, authorize(ROLE.ADMIN, ROLE.CASHIER), FeedbackController.update);
router.put('/:id', protect, authorize(ROLE.ADMIN, ROLE.CASHIER), FeedbackController.update);
router.post('/export', protect, authorize(ROLE.ADMIN, ROLE.CASHIER), FeedbackController.exportExcel);

module.exports = router;

