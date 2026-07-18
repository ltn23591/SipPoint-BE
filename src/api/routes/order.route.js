const express = require('express');
const OrderController = require('../../controllers/order.controller');
const { protect } = require('../../middleware/auth.middleware');
const { authorize } = require('../../middleware/authorize.middleware');
const { ROLE } = require('../../enums');

const router = express.Router();

router.get('/', protect, authorize(ROLE.ADMIN, ROLE.CASHIER, ROLE.BARISTA, ROLE.WAITER), OrderController.getAll);
router.get('/public/:id', OrderController.getById);
router.get('/:id', protect, authorize(ROLE.ADMIN, ROLE.CASHIER, ROLE.BARISTA, ROLE.WAITER), OrderController.getById);

router.post('/public', OrderController.create);
router.post('/', protect, authorize(ROLE.ADMIN, ROLE.CASHIER, ROLE.WAITER), OrderController.create);

router.patch('/:id/status', protect, authorize(ROLE.ADMIN, ROLE.CASHIER, ROLE.BARISTA), OrderController.updateStatus);

router.post('/:id/refund', protect, authorize(ROLE.ADMIN, ROLE.CASHIER), OrderController.refund);

module.exports = router;
