const express = require('express');
const NotificationController = require('../../controllers/notification.controller');
const { protect } = require('../../middleware/auth.middleware');
const { authorize } = require('../../middleware/authorize.middleware');
const { ROLE } = require('../../enums');

const router = express.Router();

router.post('/search', protect, NotificationController.search);
router.get('/details/:id', protect, NotificationController.getById);

// Admin / Managers / Staff can manage notifications
router.post('/create', protect, authorize(ROLE.ADMIN), NotificationController.create);
router.put('/update', protect, authorize(ROLE.ADMIN), NotificationController.update);
router.delete('/delete/:id', protect, authorize(ROLE.ADMIN), NotificationController.remove);
router.put('/update-status', protect, NotificationController.updateStatus);

module.exports = router;
