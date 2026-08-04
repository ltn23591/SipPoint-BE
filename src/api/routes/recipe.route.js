const express = require('express');
const ProductRecipeController = require('../../controllers/productRecipe.controller');
const { protect } = require('../../middleware/auth.middleware');
const { authorize } = require('../../middleware/authorize.middleware');
const { ROLE } = require('../../enums');
const validate = require('../../middleware/validate');
const recipeValidation = require('../../validations/productRecipe.validation');

const router = express.Router();

router.get('/availability', protect, ProductRecipeController.availability);

router.route('/product/:productId')
  .get(protect, recipeValidation.getByProduct, validate, ProductRecipeController.getByProduct)
  .put(protect, authorize(ROLE.ADMIN), recipeValidation.upsertRecipe, validate, ProductRecipeController.upsert)
  .delete(protect, authorize(ROLE.ADMIN), recipeValidation.getByProduct, validate, ProductRecipeController.remove);

module.exports = router;
