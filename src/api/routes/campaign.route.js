const express = require('express');
const CampaignController = require('../../controllers/campaign.controller');
const { protect } = require('../../middleware/auth.middleware');
const { authorize } = require('../../middleware/authorize.middleware');
const { ROLE } = require('../../enums');

const router = express.Router();

router.route('/')
  .get(protect, authorize(ROLE.ADMIN), CampaignController.getAll)
  .post(protect, authorize(ROLE.ADMIN), CampaignController.create);

router.route('/:id')
  .get(protect, authorize(ROLE.ADMIN), CampaignController.getById)
  .put(protect, authorize(ROLE.ADMIN), CampaignController.update)
  .delete(protect, authorize(ROLE.ADMIN), CampaignController.remove);

router.post('/:id/activate', protect, authorize(ROLE.ADMIN), CampaignController.activate);
router.post('/:id/deactivate', protect, authorize(ROLE.ADMIN), CampaignController.deactivate);

module.exports = router;
