const express = require('express');
const CategoryController = require('../../controllers/category.controller');
const { protect } = require('../../middleware/auth.middleware');
const { authorize } = require('../../middleware/authorize.middleware');
const { ROLE } = require('../../enums');

const router = express.Router();

// Lấy danh sách (Public) / Tạo mới (Admin)
router.route('/')
  .get(CategoryController.getAll)
  .post(protect, authorize(ROLE.ADMIN), CategoryController.create);

// Lấy chi tiết (Public) / Sửa, xóa (Admin)
router.route('/:id')
  .get(CategoryController.getById)
  .put(protect, authorize(ROLE.ADMIN), CategoryController.update)
  .delete(protect, authorize(ROLE.ADMIN), CategoryController.remove);

module.exports = router;
