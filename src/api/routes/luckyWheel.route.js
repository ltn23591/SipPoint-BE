const express = require('express');
const LuckyWheelController = require('../../controllers/luckyWheel.controller');
const { protect } = require('../../middleware/auth.middleware');
const { authorize } = require('../../middleware/authorize.middleware');
const { ROLE } = require('../../enums');

const router = express.Router();

// Khách hàng: vòng quay đang mở & lịch sử quay của tôi
// (khai báo trước /:id để không bị route động nuốt mất)
router.get('/active', protect, LuckyWheelController.getActive);
router.get('/me/spins', protect, LuckyWheelController.getMySpins);

// Admin: CRUD vòng quay
router.route('/')
  .get(protect, authorize(ROLE.ADMIN), LuckyWheelController.getAll)
  .post(protect, authorize(ROLE.ADMIN), LuckyWheelController.create);

router.route('/:id')
  .get(protect, authorize(ROLE.ADMIN), LuckyWheelController.getById)
  .put(protect, authorize(ROLE.ADMIN), LuckyWheelController.update)
  .delete(protect, authorize(ROLE.ADMIN), LuckyWheelController.remove);

router.patch('/:id/status', protect, authorize(ROLE.ADMIN), LuckyWheelController.updateStatus);

// Admin: log người trúng của một vòng quay
router.get('/:id/spins', protect, authorize(ROLE.ADMIN), LuckyWheelController.getWheelSpins);

// Khách hàng: thực hiện quay
router.post('/:id/spin', protect, LuckyWheelController.spin);

module.exports = router;
