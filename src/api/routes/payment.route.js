const express = require('express');
const paymentController = require('../../controllers/payment.controller');
// const { protect } = require('../../middleware/auth.middleware');

const router = express.Router();


// Tích hợp thanh toán SePay
router.post('/sepay/create', paymentController.createSepayPayment);
router.post('/sepay/ipn', paymentController.sepayIPN);

module.exports = router;
