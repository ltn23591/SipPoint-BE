const express = require('express');
const CustomerController = require('../../controllers/customer.controller');
const { protect } = require('../../middleware/auth.middleware');
const { authorize } = require('../../middleware/authorize.middleware');
const { ROLE } = require('../../enums');

const router = express.Router();

// Tất cả các routes quản lý khách hàng yêu cầu đăng nhập và có vai trò phù hợp
router.route('/')
  .get(protect, authorize(ROLE.ADMIN, ROLE.CASHIER), CustomerController.getAll)
  .post(protect, authorize(ROLE.ADMIN, ROLE.CASHIER), CustomerController.create);

// Admin: đối soát lại số liệu orderCount/redeemCount toàn bộ khách (chạy 1 lần sau khi thêm field)
router.post('/recompute-counters', protect, authorize(ROLE.ADMIN), CustomerController.recomputeCounters);

// Khách hàng lấy lịch sử điểm
router.get('/me/point-history', protect, CustomerController.getMyPointHistory);

// Khách hàng cập nhật thông tin cá nhân
router.put('/me', protect, CustomerController.updateMyProfile);

// Khách hàng lấy danh sách voucher
router.get('/me/vouchers', protect, CustomerController.getMyVouchers);

// Khách hàng lấy danh sách đơn hàng
router.route('/me/orders')
  .get(protect, CustomerController.getMyOrders)
  .post(protect, CustomerController.createMyOrder);
router.get('/me/orders/:orderId', protect, CustomerController.getMyOrderById);

router.route('/:id')
  .get(protect, authorize(ROLE.ADMIN, ROLE.CASHIER), CustomerController.getById)
  .put(protect, authorize(ROLE.ADMIN, ROLE.CASHIER), CustomerController.update);
router.post('/:id/points', protect, authorize(ROLE.ADMIN, ROLE.CASHIER), CustomerController.adjustPoints);

router.get('/:id/point-history', protect, authorize(ROLE.ADMIN, ROLE.CASHIER), CustomerController.getPointHistory);
router.get('/:id/vouchers', protect, authorize(ROLE.ADMIN, ROLE.CASHIER), CustomerController.getVouchers);

module.exports = router;
