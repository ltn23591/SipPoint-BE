const express = require('express');
const CronController = require('../../controllers/cron.controller');
const router = express.Router();

router.get('/cleanup', CronController.cleanup);

module.exports = router;
