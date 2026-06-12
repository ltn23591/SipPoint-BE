const express = require('express');
const CategoryController = require('../../controllers/category.controller');
const { protect } = require('../../middleware/auth.middleware');
const { authorize } = require('../../middleware/authorize.middleware');
const { ROLE } = require('../../enums');

const router = express.Router();

// Public: Ai cũng có thể xem danh mục (dùng để hiển thị menu)
router.get('/', CategoryController.getAll);
router.get('/:id', CategoryController.getById);

// Admin-only: Chỉ Admin mới được tạo, sửa, xóa danh mục
router.post('/', protect, authorize(ROLE.ADMIN), CategoryController.create);
router.put('/:id', protect, authorize(ROLE.ADMIN), CategoryController.update);
router.delete('/:id', protect, authorize(ROLE.ADMIN), CategoryController.remove);

module.exports = router;
