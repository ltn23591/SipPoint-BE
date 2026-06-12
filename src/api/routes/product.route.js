const express = require('express');
const upload = require('../../middleware/multer');
const ProductController = require('../../controllers/product.controller');
const { protect } = require('../../middleware/auth.middleware');
const { authorize } = require('../../middleware/authorize.middleware');
const { ROLE } = require('../../enums');

const router = express.Router();

// Public: Khách hàng và nhân viên đều có thể xem danh sách sản phẩm
router.get('/', ProductController.getAll);
router.get('/:id', ProductController.getById);

// Admin-only: Chỉ Admin mới được tạo, sửa, xóa sản phẩm
router.post('/', protect, authorize(ROLE.ADMIN), upload.any(), ProductController.create);
router.put('/:id', protect, authorize(ROLE.ADMIN), upload.any(), ProductController.update);
router.delete('/:id', protect, authorize(ROLE.ADMIN), ProductController.remove);

module.exports = router;
