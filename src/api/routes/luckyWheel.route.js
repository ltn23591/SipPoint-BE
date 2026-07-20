const express = require('express');
const LuckyWheelController = require('../../controllers/luckyWheel.controller');
const { protect } = require('../../middleware/auth.middleware');
const { authorize } = require('../../middleware/authorize.middleware');
const { ROLE } = require('../../enums');

const router = express.Router();

// Lấy cấu hình các ô phần thưởng của vòng quay
router.get('/config', LuckyWheelController.getConfigs);

// Cập nhật cấu hình vòng quay (yêu cầu Admin/Cashier)
router.put('/config', protect, authorize(ROLE.ADMIN, ROLE.CASHIER), LuckyWheelController.updateConfigs);

module.exports = router;
