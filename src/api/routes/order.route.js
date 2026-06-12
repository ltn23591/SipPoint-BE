const express = require('express');
const { body } = require('express-validator');
const OrderController = require('../../controllers/order.controller');
const { protect } = require('../../middleware/auth.middleware');
const { authorize } = require('../../middleware/authorize.middleware');
const validate = require('../../middleware/validate.middleware');
const { ROLE } = require('../../enums');

const router = express.Router();

const orderCreateValidator = [
  body('items')
    .isArray({ min: 1 })
    .withMessage('Đơn hàng phải chứa ít nhất một món ăn/đồ uống'),
  body('items.*.productId')
    .notEmpty()
    .withMessage('Mã sản phẩm (productId) là bắt buộc'),
  body('items.*.quantity')
    .isInt({ min: 1 })
    .withMessage('Số lượng món ăn/đồ uống phải lớn hơn hoặc bằng 1'),
  validate,
];

const orderStatusValidator = [
  body('status')
    .isInt()
    .withMessage('Trạng thái đơn hàng phải là một số nguyên'),
  validate,
];

const orderCancelValidator = [
  body('reason')
    .trim()
    .notEmpty()
    .withMessage('Lý do hủy đơn hàng là bắt buộc'),
  validate,
];

// Lấy danh sách và chi tiết đơn hàng (Tất cả nhân viên có quyền xem)
router.get('/', protect, authorize(ROLE.ADMIN, ROLE.CASHIER, ROLE.BARISTA, ROLE.WAITER), OrderController.getAll);
router.get('/:id', protect, authorize(ROLE.ADMIN, ROLE.CASHIER, ROLE.BARISTA, ROLE.WAITER), OrderController.getById);

// Tạo đơn hàng (Chỉ admin, thu ngân, phục vụ mới được tạo đơn hàng)
router.post('/', protect, authorize(ROLE.ADMIN, ROLE.CASHIER, ROLE.WAITER), orderCreateValidator, OrderController.create);

// Cập nhật trạng thái đơn hàng (Thu ngân, pha chế, admin)
router.patch('/:id/status', protect, authorize(ROLE.ADMIN, ROLE.CASHIER, ROLE.BARISTA), orderStatusValidator, OrderController.updateStatus);

// Hủy đơn hàng (Chỉ thu ngân, admin)
router.patch('/:id/cancel', protect, authorize(ROLE.ADMIN, ROLE.CASHIER), orderCancelValidator, OrderController.cancel);

module.exports = router;
