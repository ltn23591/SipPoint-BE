const express = require('express');
const AIController = require('../../controllers/ai.controller');

const router = express.Router();

router.post('/chat', AIController.chatWithProducts);
router.get('/recommend-top-product', AIController.recommendTopProduct);

module.exports = router;
