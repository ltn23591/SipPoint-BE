const express = require('express');
const paymentController = require('../../controllers/payment.controller');
// const { protect } = require('../../middleware/auth.middleware');

const router = express.Router();


// Tích hợp thanh toán SePay
router.post('/sepay/create', paymentController.createSepayPayment);
router.post('/sepay/ipn', paymentController.sepayIPN);
// Frontend gọi sau khi SePay redirect về với status=success
router.post('/sepay/confirm-payment', paymentController.confirmPayment);

module.exports = router;
