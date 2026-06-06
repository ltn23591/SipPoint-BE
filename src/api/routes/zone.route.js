const express = require('express');
const ZoneController = require('../../controllers/zone.controller');
const { protect } = require('../../middleware/auth.middleware');
const { authorize } = require('../../middleware/authorize.middleware');
const { ROLE } = require('../../enums');

const router = express.Router();

// Public / Authenticated user views
router.get('/', ZoneController.getAll);
router.get('/:id', ZoneController.getById);

// Admin-only actions for zone management
router.post('/', protect, authorize(ROLE.ADMIN), ZoneController.create);
router.put('/:id', protect, authorize(ROLE.ADMIN), ZoneController.update);
router.delete('/:id', protect, authorize(ROLE.ADMIN), ZoneController.remove);

module.exports = router;
