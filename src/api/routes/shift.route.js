const express = require('express');
const ShiftController = require('../../controllers/shift.controller');

const router = express.Router();

router.get('/search', ShiftController.getAll);
router.post('/open', ShiftController.open);
router.get('/:id/detail', ShiftController.getById);
router.put('/:id/close', ShiftController.close);

module.exports = router;
