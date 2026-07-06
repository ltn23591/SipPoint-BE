const express = require('express');
const CampaignController = require('../../controllers/campaign.controller');
const { protect } = require('../../middleware/auth.middleware');
const { authorize } = require('../../middleware/authorize.middleware');
const { ROLE } = require('../../enums');

const router = express.Router();

router.get('/', protect, authorize(ROLE.ADMIN), CampaignController.getAll);
router.post('/', protect, authorize(ROLE.ADMIN), CampaignController.create);
router.get('/:id', protect, authorize(ROLE.ADMIN), CampaignController.getById);
router.put('/:id', protect, authorize(ROLE.ADMIN), CampaignController.update);
router.delete('/:id', protect, authorize(ROLE.ADMIN), CampaignController.remove);

router.post('/:id/activate', protect, authorize(ROLE.ADMIN), CampaignController.activate);
router.post('/:id/deactivate', protect, authorize(ROLE.ADMIN), CampaignController.deactivate);

module.exports = router;
