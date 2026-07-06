const express = require('express');
const CustomerSegmentController = require('../../controllers/customerSegment.controller');
const { protect } = require('../../middleware/auth.middleware');
const { authorize } = require('../../middleware/authorize.middleware');
const { ROLE } = require('../../enums');

const router = express.Router();

router.post('/preview', protect, authorize(ROLE.ADMIN), CustomerSegmentController.preview);
router.get('/', protect, authorize(ROLE.ADMIN), CustomerSegmentController.getAll);
router.post('/', protect, authorize(ROLE.ADMIN), CustomerSegmentController.create);
router.get('/:id', protect, authorize(ROLE.ADMIN), CustomerSegmentController.getById);
router.put('/:id', protect, authorize(ROLE.ADMIN), CustomerSegmentController.update);
router.delete('/:id', protect, authorize(ROLE.ADMIN), CustomerSegmentController.remove);
router.post('/:id/sync', protect, authorize(ROLE.ADMIN), CustomerSegmentController.sync);
router.get('/:id/members', protect, authorize(ROLE.ADMIN), CustomerSegmentController.getMembers);

module.exports = router;
