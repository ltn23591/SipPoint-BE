const { body, param } = require('express-validator');

// Kiểm tra dữ liệu khi tạo đơn hàng mới
const createOrder = [
  body('items')
    .isArray({ min: 1 }).withMessage('Đơn hàng phải có ít nhất 1 sản phẩm'),
  body('items.*.productId')
    .notEmpty().withMessage('Mã sản phẩm là bắt buộc')
    .isMongoId().withMessage('ID sản phẩm không hợp lệ'),
  body('items.*.quantity')
    .notEmpty().withMessage('Số lượng là bắt buộc')
    .isInt({ min: 1 }).withMessage('Số lượng phải lớn hơn 0'),
  body('paymentMethod')
    .optional()
    .isIn(['cash', 'transfer', 'momo', 'zalopay', 'credit_card'])
    .withMessage('Phương thức thanh toán không hợp lệ')
];

// Kiểm tra dữ liệu khi cập nhật trạng thái đơn hàng
const updateStatus = [
  param('id')
    .isMongoId().withMessage('ID đơn hàng không hợp lệ'),
  body('status')
    .notEmpty().withMessage('Trạng thái đơn hàng là bắt buộc')
    .isIn(['pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled'])
    .withMessage('Trạng thái không hợp lệ')
];

// Kiểm tra param ID
const getById = [
  param('id')
    .isMongoId().withMessage('ID đơn hàng không hợp lệ')
];

module.exports = {
  createOrder,
  updateStatus,
  getById
};
