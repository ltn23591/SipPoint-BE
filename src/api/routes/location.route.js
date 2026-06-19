const express = require('express');
const LocationController = require('../../controllers/location.controller');

const router = express.Router();

router.post('/filter/province', LocationController.filterProvince);
router.post('/filter/district', LocationController.filterDistrict);
router.post('/filter/ward', LocationController.filterWard);

module.exports = router;
