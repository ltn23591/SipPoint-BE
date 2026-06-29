const express = require('express');
const StoreController = require('../../controllers/store.controller');
const { protect } = require('../../middleware/auth.middleware');
const { authorize } = require('../../middleware/authorize.middleware');
const { ROLE } = require('../../enums');

const router = express.Router();

router.get('/config', StoreController.getConfig);
router.put('/config', protect, authorize(ROLE.ADMIN), StoreController.updateConfig);

module.exports = router;
