const express = require('express');
const StaffRoleController = require('../../controllers/staffRole.controller');
const { protect } = require('../../middleware/auth.middleware');
const { authorize } = require('../../middleware/authorize.middleware');
const { ROLE } = require('../../enums');

const router = express.Router();

// Chỉ Admin mới có quyền thao tác với danh sách vai trò
router.get('/all', protect, authorize(ROLE.ADMIN), StaffRoleController.getAll);
router.post('/create', protect, authorize(ROLE.ADMIN), StaffRoleController.create);
router.put('/update', protect, authorize(ROLE.ADMIN), StaffRoleController.update);

module.exports = router;
