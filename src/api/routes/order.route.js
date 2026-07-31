const express = require('express');
const OrderController = require('../../controllers/order.controller');
const { protect } = require('../../middleware/auth.middleware');
const { authorize } = require('../../middleware/authorize.middleware');
const { ROLE } = require('../../enums');

const router = express.Router();

router.route('/')
  .get(protect, authorize(ROLE.ADMIN, ROLE.CASHIER, ROLE.BARISTA, ROLE.WAITER), OrderController.getAll)
  .post(protect, authorize(ROLE.ADMIN, ROLE.CASHIER, ROLE.WAITER), OrderController.create);

router.get('/public/:id/status', OrderController.getOrderStatus);
router.get('/public/:id', OrderController.getById);
router.post('/public', OrderController.create);

router.get('/:id', protect, authorize(ROLE.ADMIN, ROLE.CASHIER, ROLE.BARISTA, ROLE.WAITER), OrderController.getById);

router.patch('/:id/status', protect, authorize(ROLE.ADMIN, ROLE.CASHIER, ROLE.BARISTA), OrderController.updateStatus);

router.post('/:id/refund', protect, authorize(ROLE.ADMIN, ROLE.CASHIER), OrderController.refund);

module.exports = router;
