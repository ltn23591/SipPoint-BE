const express = require('express');
const upload = require('../../middleware/multer');
const ProductController = require('../../controllers/product.controller');
const { protect } = require('../../middleware/auth.middleware');
const { authorize } = require('../../middleware/authorize.middleware');
const { ROLE } = require('../../enums');
const validate = require('../../middleware/validate');
const productValidation = require('../../validations/product.validation');

const router = express.Router();

// Lấy danh sách (Public) / Tạo mới (Admin)
router.route('/')
  .get(ProductController.getAll)
  .post(protect, authorize(ROLE.ADMIN), upload.any(), productValidation.createProduct, validate, ProductController.create);

// Lấy chi tiết (Public) / Sửa, xóa (Admin)
router.route('/:id')
  .get(productValidation.getById, validate, ProductController.getById)
  .put(protect, authorize(ROLE.ADMIN), upload.any(), productValidation.updateProduct, validate, ProductController.update)
  .delete(protect, authorize(ROLE.ADMIN), productValidation.getById, validate, ProductController.remove);

router.post('/import', protect, authorize(ROLE.ADMIN), upload.any(), ProductController.importExcel);
router.post('/validate-cart', ProductController.validateCart);
router.patch('/:id/restore', protect, authorize(ROLE.ADMIN), ProductController.restore);

module.exports = router;
