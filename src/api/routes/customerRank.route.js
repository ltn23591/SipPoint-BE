const express = require('express');
const CustomerRankController = require('../../controllers/customerRank.controller');

const router = express.Router();

router.get('/', CustomerRankController.getAll);
router.post('/', CustomerRankController.create);
router.put('/:id', CustomerRankController.update);
router.delete('/:id', CustomerRankController.delete);

module.exports = router;
