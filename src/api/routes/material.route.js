const express = require('express');
const MaterialController = require('../../controllers/material.controller');
const { protect } = require('../../middleware/auth.middleware');
const { authorize } = require('../../middleware/authorize.middleware');
const { ROLE } = require('../../enums');
const validate = require('../../middleware/validate');
const materialValidation = require('../../validations/material.validation');

const router = express.Router();

router.route('/')
  .get(protect, MaterialController.getAll)
  .post(protect, authorize(ROLE.ADMIN), materialValidation.createMaterial, validate, MaterialController.create);

router.get('/low-stock', protect, MaterialController.getLowStock);

router.route('/:id')
  .get(protect, materialValidation.getById, validate, MaterialController.getById)
  .put(protect, authorize(ROLE.ADMIN), materialValidation.updateMaterial, validate, MaterialController.update)
  .delete(protect, authorize(ROLE.ADMIN), materialValidation.getById, validate, MaterialController.remove);

router.get('/:id/movements', protect, materialValidation.getById, validate, MaterialController.getMovements);
router.post('/:id/import', protect, authorize(ROLE.ADMIN), materialValidation.importStock, validate, MaterialController.importStock);
router.patch('/:id/adjust', protect, authorize(ROLE.ADMIN), materialValidation.adjustStock, validate, MaterialController.adjustStock);
router.patch('/:id/restore', protect, authorize(ROLE.ADMIN), materialValidation.getById, validate, MaterialController.restore);

module.exports = router;
