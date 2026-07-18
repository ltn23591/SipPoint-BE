const express = require('express');
const ZoneController = require('../../controllers/zone.controller');
const { protect } = require('../../middleware/auth.middleware');
const { authorize } = require('../../middleware/authorize.middleware');
const { ROLE } = require('../../enums');

const router = express.Router();

// Quản lý khu vực: Lấy danh sách (Public) / Tạo mới (Admin)
router.route('/')
  .get(ZoneController.getAll)
  .post(protect, authorize(ROLE.ADMIN), ZoneController.create);

// Quản lý khu vực: Lấy chi tiết (Public) / Sửa, xóa (Admin)
router.route('/:id')
  .get(ZoneController.getById)
  .put(protect, authorize(ROLE.ADMIN), ZoneController.update)
  .delete(protect, authorize(ROLE.ADMIN), ZoneController.remove);

module.exports = router;
