const express = require('express');
const ActivityLogController = require('../../controllers/activityLog.controller');
const { protect } = require('../../middleware/auth.middleware');
const { authorize } = require('../../middleware/authorize.middleware');
const { ROLE } = require('../../enums');

const router = express.Router();

// Chỉ Admin mới được quyền truy cập nhật ký hoạt động
router.post('/search', protect, authorize(ROLE.ADMIN), ActivityLogController.search);

module.exports = router;
