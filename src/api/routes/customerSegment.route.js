const express = require('express');
const CustomerSegmentController = require('../../controllers/customerSegment.controller');
const { protect } = require('../../middleware/auth.middleware');
const { authorize } = require('../../middleware/authorize.middleware');
const { ROLE } = require('../../enums');

const router = express.Router();

router.post('/preview', protect, authorize(ROLE.ADMIN), CustomerSegmentController.preview);
router.route('/')
  .get(protect, authorize(ROLE.ADMIN), CustomerSegmentController.getAll)
  .post(protect, authorize(ROLE.ADMIN), CustomerSegmentController.create);

router.route('/:id')
  .get(protect, authorize(ROLE.ADMIN), CustomerSegmentController.getById)
  .put(protect, authorize(ROLE.ADMIN), CustomerSegmentController.update)
  .delete(protect, authorize(ROLE.ADMIN), CustomerSegmentController.remove);
router.post('/:id/sync', protect, authorize(ROLE.ADMIN), CustomerSegmentController.sync);
router.patch('/:id/toggle-active', protect, authorize(ROLE.ADMIN), CustomerSegmentController.toggleActive);
router.get('/:id/members', protect, authorize(ROLE.ADMIN), CustomerSegmentController.getMembers);

module.exports = router;
