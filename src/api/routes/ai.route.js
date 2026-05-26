const express = require('express');
const AIController = require('../../controllers/ai.controller');

const router = express.Router();

router.post('/chat', AIController.chatWithProducts);

module.exports = router;
