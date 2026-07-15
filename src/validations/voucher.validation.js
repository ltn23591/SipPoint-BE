const { body, param } = require('express-validator');

// Kiểm tra dữ liệu khi tạo voucher mới
const createVoucher = [
  body('code')
    .notEmpty().withMessage('Mã voucher là bắt buộc')
    .isLength({ min: 3, max: 50 }).withMessage('Mã voucher từ 3-50 ký tự')
    .trim()
    .toUpperCase(),
  body('discountType')
    .notEmpty().withMessage('Loại giảm giá là bắt buộc')
    .isIn(['percentage', 'fixed']).withMessage('Loại giảm giá phải là "percentage" hoặc "fixed"'),
  body('discountValue')
    .notEmpty().withMessage('Giá trị giảm giá là bắt buộc')
    .isNumeric().withMessage('Giá trị giảm giá phải là số')
    .custom(val => val > 0).withMessage('Giá trị giảm giá phải lớn hơn 0'),
  body('minOrderValue')
    .optional()
    .isNumeric().withMessage('Giá trị đơn hàng tối thiểu phải là số'),
  body('maxDiscount')
    .optional()
    .isNumeric().withMessage('Giảm giá tối đa phải là số'),
  body('startDate')
    .optional()
    .isISO8601().withMessage('Ngày bắt đầu không hợp lệ'),
  body('endDate')
    .optional()
    .isISO8601().withMessage('Ngày kết thúc không hợp lệ')
];

// Kiểm tra param ID
const getById = [
  param('id')
    .isMongoId().withMessage('ID voucher không hợp lệ')
];

module.exports = {
  createVoucher,
  getById
};
