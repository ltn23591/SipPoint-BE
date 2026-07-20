const express = require('express');
const CustomerController = require('../../controllers/customer.controller');
const LuckyWheelController = require('../../controllers/luckyWheel.controller');
const { protect } = require('../../middleware/auth.middleware');
const { authorize } = require('../../middleware/authorize.middleware');
const { ROLE } = require('../../enums');

const router = express.Router();

// Tất cả các routes quản lý khách hàng yêu cầu đăng nhập và có vai trò phù hợp
router.route('/')
  .get(protect, authorize(ROLE.ADMIN, ROLE.CASHIER), CustomerController.getAll)
  .post(protect, authorize(ROLE.ADMIN, ROLE.CASHIER), CustomerController.create);

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

// Lucky Wheel routes
router.get('/me/lucky-wheel', protect, LuckyWheelController.getInfo);
router.post('/me/lucky-wheel/spin', protect, LuckyWheelController.spin);

module.exports = router;
