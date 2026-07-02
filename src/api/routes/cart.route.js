const express = require('express');
const CartController = require('../../controllers/cart.controller');
const { protect } = require('../../middleware/auth.middleware');

const router = express.Router();

router.get('/', protect, CartController.get);
router.post('/add', protect, CartController.add);
router.put('/qty', protect, CartController.updateQty);
router.post('/remove', protect, CartController.remove);
router.delete('/clear', protect, CartController.clear);

module.exports = router;
