const express = require('express');
const AIController = require('../../controllers/ai.controller');

const router = express.Router();

router.get('/', AIController.recommendTopProduct);
router.get('/recommend-top-product', AIController.recommendTopProduct);

module.exports = router;
