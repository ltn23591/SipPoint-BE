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
router.patch('/update-status', protect, authorize(ROLE.ADMIN, ROLE.CASHIER, ROLE.BARISTA), OrderController.updateStatus); // Supporting PATCH /update-status payload from FE

// Hủy đơn hàng (Chỉ thu ngân, admin)
router.patch('/:id/cancel', protect, authorize(ROLE.ADMIN, ROLE.CASHIER), OrderController.cancel);
router.patch('/cancel/:id', protect, authorize(ROLE.ADMIN, ROLE.CASHIER), OrderController.cancel); // FE: /cancel/:id

// Xác nhận đơn hàng
router.patch('/confirm/:id', protect, authorize(ROLE.ADMIN, ROLE.CASHIER), OrderController.confirm);

// Hoàn tất đơn hàng
router.patch('/complete/:id', protect, authorize(ROLE.ADMIN, ROLE.CASHIER, ROLE.BARISTA), OrderController.complete);

module.exports = router;
