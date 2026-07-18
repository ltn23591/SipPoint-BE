const express = require('express');
const StoreController = require('../../controllers/store.controller');
const { protect } = require('../../middleware/auth.middleware');
const { authorize } = require('../../middleware/authorize.middleware');
const { ROLE } = require('../../enums');

const router = express.Router();

router.route('/config')
  .get(StoreController.getConfig)
  .put(protect, authorize(ROLE.ADMIN), StoreController.updateConfig);

module.exports = router;
