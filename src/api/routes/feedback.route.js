const express = require('express');
const FeedbackController = require('../../controllers/feedback.controller');
const { protect } = require('../../middleware/auth.middleware');
const { authorize } = require('../../middleware/authorize.middleware');
const { ROLE } = require('../../enums');

const router = express.Router();

router.post('/search', protect, FeedbackController.search);
router.get('/detail/:id', protect, FeedbackController.getById);

// Admin / Managers / Staff can update or reply to reviews and export
router.put('/update', protect, FeedbackController.update);
router.post('/export', protect, FeedbackController.exportFeedbacks);

module.exports = router;
