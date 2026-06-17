const express = require('express');
const OrderController = require('../../controllers/order.controller');
const { protect } = require('../../middleware/auth.middleware');
const { authorize } = require('../../middleware/authorize.middleware');
const { ROLE } = require('../../enums');

const router = express.Router();

// Lấy danh sách và chi tiết đơn hàng (Tất cả nhân viên có quyền xem)
router.get('/', protect, authorize(ROLE.ADMIN, ROLE.CASHIER, ROLE.BARISTA, ROLE.WAITER), OrderController.getAll);
router.get('/:id', protect, authorize(ROLE.ADMIN, ROLE.CASHIER, ROLE.BARISTA, ROLE.WAITER), OrderController.getById);

// Tạo đơn hàng (Chỉ admin, thu ngân, phục vụ mới được tạo đơn hàng)
router.post('/', protect, authorize(ROLE.ADMIN, ROLE.CASHIER, ROLE.WAITER), OrderController.create);

// Cập nhật trạng thái đơn hàng (Thu ngân, pha chế, admin)
router.patch('/:id/status', protect, authorize(ROLE.ADMIN, ROLE.CASHIER, ROLE.BARISTA), OrderController.updateStatus);

// Hủy đơn hàng (Chỉ thu ngân, admin)
router.patch('/:id/cancel', protect, authorize(ROLE.ADMIN, ROLE.CASHIER), OrderController.cancel);

module.exports = router;
