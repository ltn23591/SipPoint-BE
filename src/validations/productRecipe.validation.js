const { body, param } = require('express-validator');

const getByProduct = [
  param('productId').isMongoId().withMessage('ID sản phẩm không hợp lệ'),
];

const upsertRecipe = [
  param('productId').isMongoId().withMessage('ID sản phẩm không hợp lệ'),
  body('items')
    .isArray({ min: 1 }).withMessage('Công thức phải có ít nhất một nguyên liệu'),
  body('items.*.materialId')
    .isMongoId().withMessage('ID nguyên liệu không hợp lệ'),
  body('items.*.quantity')
    .isFloat({ gt: 0 }).withMessage('Định mức nguyên liệu phải lớn hơn 0'),
];

module.exports = {
  getByProduct,
  upsertRecipe,
};
