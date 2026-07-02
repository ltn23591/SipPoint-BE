const express = require('express');
const CustomerController = require('../../controllers/customer.controller');
const { protect } = require('../../middleware/auth.middleware');
const { authorize } = require('../../middleware/authorize.middleware');
const { ROLE } = require('../../enums');

const router = express.Router();

// Tất cả các routes quản lý khách hàng yêu cầu đăng nhập và có vai trò phù hợp
router.get('/', protect, authorize(ROLE.ADMIN, ROLE.CASHIER), CustomerController.getAll);
router.post('/', protect, authorize(ROLE.ADMIN, ROLE.CASHIER), CustomerController.create);

// Khách hàng lấy lịch sử điểm
router.get('/me/point-history', protect, CustomerController.getMyPointHistory);

// Khách hàng cập nhật thông tin cá nhân
router.put('/me', protect, CustomerController.updateMyProfile);

// Khách hàng lấy danh sách voucher
router.get('/me/vouchers', protect, CustomerController.getMyVouchers);

// Khách hàng lấy danh sách đơn hàng
router.get('/me/orders', protect, CustomerController.getMyOrders);
router.get('/me/orders/:orderId', protect, CustomerController.getMyOrderById);
router.post('/me/orders', protect, CustomerController.createMyOrder);

router.get('/:id', protect, authorize(ROLE.ADMIN, ROLE.CASHIER), CustomerController.getById);
router.put('/:id', protect, authorize(ROLE.ADMIN, ROLE.CASHIER), CustomerController.update);
router.post('/:id/points', protect, authorize(ROLE.ADMIN, ROLE.CASHIER), CustomerController.adjustPoints);

module.exports = router;
