const express = require('express');
const upload = require('../../middleware/multer');
const ProductController = require('../../controllers/product.controller');
const { protect } = require('../../middleware/auth.middleware');
const { authorize } = require('../../middleware/authorize.middleware');
const { ROLE } = require('../../enums');
const validate = require('../../middleware/validate');
const productValidation = require('../../validations/product.validation');

const router = express.Router();

// Public: Khách hàng và nhân viên đều có thể xem danh sách sản phẩm
router.get('/', ProductController.getAll);
router.get('/:id', productValidation.getById, validate, ProductController.getById);

// Admin-only: Chỉ Admin mới được tạo, sửa, xóa sản phẩm
router.post('/import', protect, authorize(ROLE.ADMIN), upload.any(), ProductController.importExcel);
router.post('/', protect, authorize(ROLE.ADMIN), upload.any(), productValidation.createProduct, validate, ProductController.create);
router.put('/:id', protect, authorize(ROLE.ADMIN), upload.any(), productValidation.updateProduct, validate, ProductController.update);
router.delete('/:id', protect, authorize(ROLE.ADMIN), productValidation.getById, validate, ProductController.remove);

module.exports = router;
