const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const sepayService = require('../services/sepay.service');
const createSepayPayment = catchAsync(async (req, res, next) => {
  const { amount, orderId, orderInfo, returnUrl } = req.body;

  if (!amount || !orderId) {
    return next(new AppError('Amount and orderId are required', 400));
  }

  // Sử dụng returnUrl truyền lên từ Frontend, nếu không có thì lấy FRONTEND_URL trong .env
  const defaultReturnUrl = returnUrl || `${process.env.FRONTEND_URL}/order`;
  
  const paymentData = sepayService.createSepayCheckout({
    amount,
    orderId,
    orderInfo,
    returnUrl: defaultReturnUrl
  });

  res.status(200).json({
    status: 'success',
    data: paymentData
  });
});

const sepayIPN = catchAsync(async (req, res, next) => {
  console.log('SePay IPN Request Body:', req.body);
  
  // Note: tuỳ thuộc data SePay truyền về, ví dụ có req.body.code hoặc req.body.status
  // Nên verify signature nếu có
  
  // Ở đây là logic giả định cập nhật đơn hàng
  const { order_invoice_number, payment_status, error_code } = req.body;
  
  if (payment_status === 'SUCCESS' || payment_status === 'PAID') {
    // TODO: Tìm đơn hàng theo order_invoice_number và cập nhật isPaid = true, status = 'PAID'
    console.log(`SePay Payment successful for order ${order_invoice_number}`);
  } else {
    console.log(`SePay Payment failed for order ${order_invoice_number}`);
  }

  // Phản hồi HTTP 200 OK cho SePay biết đã nhận được IPN
  res.status(200).json({ success: true });
});

module.exports = {
  createSepayPayment,
  sepayIPN
};
