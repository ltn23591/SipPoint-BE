const crypto = require('crypto');
const { SePayPgClient } = require('sepay-pg-node');
const AppError = require('../utils/AppError');

const PAID_PG_STATUSES = new Set(['CAPTURED', 'PAID', 'SUCCESS', 'COMPLETED']);

let cachedClient = null;
const getSepayClient = () => {
  if (cachedClient) return cachedClient;
  const merchantId = process.env.SEPAY_MERCHANT_ID;
  const secretKey = process.env.SEPAY_SECRET_KEY;
  if (!merchantId || !secretKey) {
    throw new AppError('Chưa cấu hình thông tin merchant SePay', 500);
  }
  cachedClient = new SePayPgClient({
    env: process.env.SEPAY_ENV || 'sandbox',
    merchant_id: merchantId,
    secret_key: secretKey,
  });
  return cachedClient;
};

const safeEqual = (a, b) => {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
};

const createSepayCheckout = (orderData) => {
  const client = getSepayClient();
  const { amount, orderId, orderInfo, returnUrl } = orderData;

  const checkoutURL = client.checkout.initCheckoutUrl();

  const checkoutFormfields = client.checkout.initOneTimePaymentFields({
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
    checkoutFormfields,
  };
};

// Xác thực trực tiếp trạng thái giao dịch qua SePay Payment Gateway Open API
const verifySepayOrderPaid = async (orderInvoiceNumber, expectedAmount = 0) => {
  if (!orderInvoiceNumber) {
    return { verified: false, reason: 'Missing order invoice number' };
  }
  try {
    const client = getSepayClient();
    const response = await client.order.retrieve(String(orderInvoiceNumber));
    const pgOrder = response?.data?.data || response?.data || null;
    if (!pgOrder) {
      return { verified: false, reason: 'Order not found on SePay' };
    }

    const orderStatus = String(pgOrder.order_status || pgOrder.status || '').toUpperCase();
    const isPaidStatus = PAID_PG_STATUSES.has(orderStatus);
    const pgAmount = Number(pgOrder.order_amount ?? pgOrder.amount ?? expectedAmount);
    const amountValid = Number(expectedAmount) <= 0 || pgAmount >= Number(expectedAmount);

    return {
      verified: isPaidStatus && amountValid,
      status: orderStatus,
      amount: pgAmount,
      orderData: pgOrder,
    };
  } catch (error) {
    const statusCode = error?.response?.status;
    console.warn(`[SePay] Retrieve order "${orderInvoiceNumber}" failed (${statusCode || 'err'}):`, error?.message);
    return {
      verified: false,
      reason: error?.response?.data?.message || error.message,
    };
  }
};

// Xác thực header Authorization: Apikey <key> từ SePay Bank Webhook
const verifyBankWebhookApiKey = (req) => {
  const configuredKey = (process.env.SEPAY_WEBHOOK_API_KEY || '').trim();
  if (!configuredKey) {
    if (process.env.NODE_ENV === 'production') {
      return { valid: false, reason: 'SEPAY_WEBHOOK_API_KEY chưa được cấu hình' };
    }
    return { valid: true, skipped: true };
  }

  const authHeader = req?.headers?.authorization || '';
  const xApiKey = req?.headers?.['x-api-key'] || '';
  let providedKey = '';

  const match = String(authHeader).match(/^(?:Apikey|Bearer)\s+(.+)$/i);
  if (match) {
    providedKey = match[1].trim();
  } else if (xApiKey) {
    providedKey = String(xApiKey).trim();
  }

  return {
    valid: safeEqual(providedKey, configuredKey),
    reason: 'Invalid webhook API key',
  };
};

// Xác thực X-Secret-Key header khi SePay PG gửi IPN
const verifyPgSecretHeader = (req) => {
  const secretKey = (process.env.SEPAY_SECRET_KEY || '').trim();
  if (!secretKey) return false;
  const headerSecret = req?.headers?.['x-secret-key'] || req?.headers?.['x-sepay-secret-key'];
  if (!headerSecret) return false;
  return safeEqual(String(headerSecret).trim(), secretKey);
};

// Xác thực chữ ký HMAC-SHA256 cho payload (thay thế lời gọi lỗi sepayClient.webhook)
const verifyWebhookSignature = (requestData) => {
  try {
    const secretKey = process.env.SEPAY_SECRET_KEY;
    if (!secretKey || !requestData || !requestData.signature) return false;

    const client = getSepayClient();
    if (typeof client.checkout?.signFields === 'function') {
      const expectedSignature = client.checkout.signFields({ ...requestData });
      return safeEqual(String(requestData.signature), expectedSignature);
    }
    return false;
  } catch (error) {
    console.error('Lỗi verify chữ ký SePay:', error);
    return false;
  }
};

module.exports = {
  getSepayClient,
  createSepayCheckout,
  verifySepayOrderPaid,
  verifyBankWebhookApiKey,
  verifyPgSecretHeader,
  verifyWebhookSignature,
};
