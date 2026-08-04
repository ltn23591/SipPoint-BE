const { body, param } = require('express-validator');

const createMaterial = [
  body('name')
    .notEmpty().withMessage('Tên nguyên liệu là bắt buộc')
    .isLength({ max: 150 }).withMessage('Tên nguyên liệu tối đa 150 ký tự')
    .trim(),
  body('unit')
    .notEmpty().withMessage('Đơn vị tính là bắt buộc')
    .trim(),
  body('onHand')
    .optional()
    .isFloat({ min: 0 }).withMessage('Tồn kho phải là số >= 0'),
  body('minThreshold')
    .optional()
    .isFloat({ min: 0 }).withMessage('Ngưỡng cảnh báo phải là số >= 0'),
  body('cost')
    .optional()
    .isFloat({ min: 0 }).withMessage('Giá vốn phải là số >= 0'),
];

const updateMaterial = [
  param('id').isMongoId().withMessage('ID nguyên liệu không hợp lệ'),
  body('name')
    .optional()
    .isLength({ max: 150 }).withMessage('Tên nguyên liệu tối đa 150 ký tự')
    .trim(),
  body('unit')
    .optional()
    .notEmpty().withMessage('Đơn vị tính không được để trống')
    .trim(),
  body('minThreshold')
    .optional()
    .isFloat({ min: 0 }).withMessage('Ngưỡng cảnh báo phải là số >= 0'),
  body('cost')
    .optional()
    .isFloat({ min: 0 }).withMessage('Giá vốn phải là số >= 0'),
];

const getById = [
  param('id').isMongoId().withMessage('ID nguyên liệu không hợp lệ'),
];

const importStock = [
  param('id').isMongoId().withMessage('ID nguyên liệu không hợp lệ'),
  body('quantity')
    .notEmpty().withMessage('Số lượng nhập kho là bắt buộc')
    .isFloat({ gt: 0 }).withMessage('Số lượng nhập kho phải lớn hơn 0'),
  body('cost')
    .optional()
    .isFloat({ min: 0 }).withMessage('Giá vốn phải là số >= 0'),
];

const adjustStock = [
  param('id').isMongoId().withMessage('ID nguyên liệu không hợp lệ'),
  body('quantityChange')
    .notEmpty().withMessage('Lượng điều chỉnh là bắt buộc')
    .isFloat().withMessage('Lượng điều chỉnh phải là số')
    .custom((val) => Number(val) !== 0).withMessage('Lượng điều chỉnh phải khác 0'),
];

module.exports = {
  createMaterial,
  updateMaterial,
  getById,
  importStock,
  adjustStock,
};
