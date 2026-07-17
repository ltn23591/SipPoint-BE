const { body, param } = require('express-validator');

// Kiểm tra dữ liệu khi tạo danh mục mới
const createCategory = [
  body('name')
    .notEmpty().withMessage('Tên danh mục là bắt buộc')
    .isLength({ max: 100 }).withMessage('Tên danh mục tối đa 100 ký tự')
    .trim()
];

// Kiểm tra dữ liệu khi cập nhật danh mục
const updateCategory = [
  param('id')
    .isMongoId().withMessage('ID danh mục không hợp lệ'),
  body('name')
    .optional()
    .isLength({ max: 100 }).withMessage('Tên danh mục tối đa 100 ký tự')
    .trim()
];

// Kiểm tra param ID
const getById = [
  param('id')
    .isMongoId().withMessage('ID danh mục không hợp lệ')
];

module.exports = {
  createCategory,
  updateCategory,
  getById
};
