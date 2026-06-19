const express = require('express');
const ProductPriceController = require('../../controllers/productPrice.controller');
const { protect } = require('../../middleware/auth.middleware');
const { authorize } = require('../../middleware/authorize.middleware');
const { ROLE } = require('../../enums');

const router = express.Router();

router.post('/search', protect, ProductPriceController.search);
router.get('/details/:id', protect, ProductPriceController.getById);

// Admin / Manager mới được quyền điều chỉnh giá
router.post('/create-or-update', protect, authorize(ROLE.ADMIN), ProductPriceController.createOrUpdate);

module.exports = router;
