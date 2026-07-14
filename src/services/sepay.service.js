const { SePayPgClient } = require('sepay-pg-node');

// Khởi tạo client SePay với cấu hình từ file .env
const sepayClient = new SePayPgClient({
  env: process.env.SEPAY_ENV,
  merchant_id: process.env.SEPAY_MERCHANT_ID,
  secret_key: process.env.SEPAY_SECRET_KEY
});

const createSepayCheckout = (orderData) => {
  const { amount, orderId, orderInfo, returnUrl } = orderData;
  
  // initCheckoutUrl is typically synchronous in sepay-pg-node if it just constructs the URL
  const checkoutURL = sepayClient.checkout.initCheckoutUrl();
  
  const checkoutFormfields = sepayClient.checkout.initOneTimePaymentFields({
    payment_method: 'BANK_TRANSFER',
    order_invoice_number: orderId.toString(),
    order_amount: parseInt(amount, 10),
    currency: 'VND',
    order_description: orderInfo || `Thanh toan don hang ${orderId}`,
    success_url: `${returnUrl}?status=success&orderId=${orderId}`,
    error_url: `${returnUrl}?status=error&orderId=${orderId}`,
    cancel_url: `${returnUrl}?status=cancel&orderId=${orderId}`,
  });

  return {
    checkoutURL,
    checkoutFormfields
  };
};

const verifyWebhookSignature = (requestData) => {
  // Hàm này tuỳ thuộc vào thư viện sepay-pg-node hỗ trợ
  // Hoặc tự viết dựa trên thuật toán hash HMAC SHA256 của SePay
  try {
    return sepayClient.webhook.verifySignature(requestData);
  } catch (error) {
    console.error('Lỗi verify chữ ký SePay:', error);
    return false;
  }
};

module.exports = {
  sepayClient,
  createSepayCheckout,
  verifyWebhookSignature
};
