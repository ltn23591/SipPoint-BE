const { body, param } = require('express-validator');

// Kiểm tra dữ liệu khi tạo sản phẩm mới
const createProduct = [
  body('name')
    .notEmpty().withMessage('Tên sản phẩm là bắt buộc')
    .isLength({ max: 200 }).withMessage('Tên sản phẩm tối đa 200 ký tự')
    .trim(),
  body('price')
    .notEmpty().withMessage('Giá sản phẩm là bắt buộc')
    .isNumeric().withMessage('Giá phải là số')
    .custom(val => val >= 0).withMessage('Giá không được âm'),
  body('category')
    .notEmpty().withMessage('Danh mục sản phẩm là bắt buộc')
    .isMongoId().withMessage('ID danh mục không hợp lệ'),
  body('stock')
    .optional()
    .isInt({ min: 0 }).withMessage('Số lượng tồn kho phải là số nguyên >= 0'),
  body('description')
    .optional()
    .isLength({ max: 2000 }).withMessage('Mô tả tối đa 2000 ký tự')
    .trim()
];

// Kiểm tra dữ liệu khi cập nhật sản phẩm
const updateProduct = [
  param('id')
    .isMongoId().withMessage('ID sản phẩm không hợp lệ'),
  body('name')
    .optional()
    .isLength({ max: 200 }).withMessage('Tên sản phẩm tối đa 200 ký tự')
    .trim(),
  body('price')
    .optional()
    .isNumeric().withMessage('Giá phải là số')
    .custom(val => val >= 0).withMessage('Giá không được âm'),
  body('category')
    .optional()
    .isMongoId().withMessage('ID danh mục không hợp lệ'),
  body('stock')
    .optional()
    .isInt({ min: 0 }).withMessage('Số lượng tồn kho phải là số nguyên >= 0')
];

// Kiểm tra param ID
const getById = [
  param('id')
    .isMongoId().withMessage('ID sản phẩm không hợp lệ')
];

module.exports = {
  createProduct,
  updateProduct,
  getById
};
