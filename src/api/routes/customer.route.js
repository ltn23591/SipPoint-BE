const express = require('express');
const CustomerController = require('../../controllers/customer.controller');

const router = express.Router();

router.get('/', CustomerController.getAll);
router.post('/', CustomerController.create);
router.get('/:id', CustomerController.getById);
router.put('/:id', CustomerController.update);
router.post('/:id/points', CustomerController.adjustPoints);

module.exports = router;
