const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const sepayService = require('../services/sepay.service');
const Order = require('../models/order.model');
const { ORDER_STATUS, PAYMENT_METHOD } = require('../enums');
const { emitToAll } = require('../services/socket.service');

const ORDER_ITEMS_POPULATE = {
  path: 'items',
  populate: { path: 'productId', select: 'name image price' },
};

const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;

const findOrderByCodeOrId = async (codeOrId) => {
  if (!codeOrId) return null;
  const normalized = String(codeOrId).trim();
  let order = await Order.findOne({ code: normalized.toUpperCase() });
  if (!order && OBJECT_ID_REGEX.test(normalized)) {
    order = await Order.findById(normalized);
  }
  return order;
};

const populateOrderById = (orderId) =>
  Order.findById(orderId)
    .populate('tableId', 'name zoneId')
    .populate('customerId', 'fullName phone')
    .populate('createdBy', 'name email')
    .populate(ORDER_ITEMS_POPULATE);

const createSepayPayment = catchAsync(async (req, res, next) => {
  const { amount, orderId, orderInfo, returnUrl } = req.body;

  if (!orderId) {
    return next(new AppError('orderId is required', 400));
  }

  const order = await findOrderByCodeOrId(orderId);
  if (order) {
    if (order.isPaid) {
      return next(new AppError('Đơn hàng này đã được thanh toán', 400));
    }
    if (order.status === ORDER_STATUS.CANCELLED || order.status === ORDER_STATUS.REFUNDED) {
      return next(new AppError('Không thể thanh toán đơn hàng đã hủy hoặc hoàn trả', 400));
    }
  }

  const payableAmount = order ? order.total : parseInt(amount, 10);
  if (!payableAmount || Number.isNaN(payableAmount) || payableAmount <= 0) {
    return next(new AppError('Số tiền thanh toán không hợp lệ', 400));
  }

  // Sử dụng returnUrl truyền lên từ Frontend, nếu không có thì lấy FRONTEND_URL trong .env
  const defaultReturnUrl = returnUrl || `${process.env.FRONTEND_URL}/order`;

  const paymentData = sepayService.createSepayCheckout({
    amount: payableAmount,
    orderId: order ? order.code : orderId,
    orderInfo,
    returnUrl: defaultReturnUrl,
  });

  res.status(200).json({
    success: true,
    data: paymentData,
  });
});

const sepayIPN = catchAsync(async (req, res) => {
  const body = req.body || {};
  const invoiceNumber = body?.order?.order_invoice_number || body.order_invoice_number;
  const pgStatus = String(
    body?.order?.order_status || body.payment_status || body.notification_type || ''
  ).toUpperCase();
  const { content, transferType, transferAmount } = body;

  let channel = null;
  let orderCodeOrId = '';

  // Trường hợp 1: Callback / IPN từ SePay Payment Gateway (hỗ trợ cả nested & flat payload)
  const pgPaidStatuses = new Set(['ORDER_PAID', 'SUCCESS', 'PAID', 'CAPTURED', 'COMPLETED']);
  if (invoiceNumber && pgPaidStatuses.has(pgStatus)) {
    channel = 'PG';
    orderCodeOrId = String(invoiceNumber).trim();
  }
  // Trường hợp 2: Webhook giao dịch chuyển khoản ngân hàng trực tiếp từ SePay
  else if (content) {
    // Chỉ xử lý giao dịch tiền vào
    if (transferType && String(transferType).toLowerCase() !== 'in') {
      return res.status(200).json({ success: true });
    }

    const keyCheck = sepayService.verifyBankWebhookApiKey(req);
    if (!keyCheck.valid) {
      console.warn('[SePay Webhook] Rejected unauthorized bank webhook request');
      return res.status(401).json({ success: false, message: 'Unauthorized webhook request' });
    }

    const match = String(content).match(/OD-\d{6}-\d{4}/i);
    if (match) {
      channel = 'BANK';
      orderCodeOrId = match[0].toUpperCase();
    }
  }

  if (channel && orderCodeOrId) {
    const order = await findOrderByCodeOrId(orderCodeOrId);

    if (!order) {
      console.warn(`[SePay] Order not found for code/id: ${orderCodeOrId}`);
      return res.status(200).json({ success: true });
    }

    if (channel === 'PG') {
      const hasSecretHeader = sepayService.verifyPgSecretHeader(req);
      let verifiedByApi = false;
      if (!hasSecretHeader) {
        const pgCheck = await sepayService.verifySepayOrderPaid(order.code, order.total);
        verifiedByApi = pgCheck.verified;
      }
      if (!hasSecretHeader && !verifiedByApi) {
        console.warn(`[SePay PG IPN] Unverified notification for order ${order.code}`);
        return res.status(401).json({ success: false, message: 'Unverified SePay PG IPN' });
      }
    } else if (channel === 'BANK' && transferAmount !== undefined) {
      if (Number(transferAmount) < Number(order.total)) {
        console.warn(
          `[SePay Bank] Underpayment for ${order.code}: received ${transferAmount}, expected ${order.total}`
        );
        return res.status(200).json({ success: true });
      }
    }

    if (order.status === ORDER_STATUS.CANCELLED || order.status === ORDER_STATUS.REFUNDED) {
      console.warn(`[SePay] Ignoring payment IPN for terminal order ${order.code} (${order.status})`);
      return res.status(200).json({ success: true });
    }

    if (!order.isPaid) {
      const updateFields =
        order.status === ORDER_STATUS.PENDING
          ? { isPaid: true, status: ORDER_STATUS.CONFIRMED }
          : { isPaid: true };

      const updated = await Order.findOneAndUpdate(
        { _id: order._id, isPaid: false },
        { $set: updateFields },
        { new: true }
      );

      if (updated) {
        const populatedOrder = await populateOrderById(updated._id);
        emitToAll('order_status_updated', populatedOrder);
        console.log(`Successfully updated order ${updated.code} (isPaid=true, status=${updated.status}).`);
      }
    }
  }

  // Phản hồi HTTP 200 OK cho SePay biết đã nhận được IPN
  res.status(200).json({ success: true });
});

// API cho Frontend gọi sau khi SePay redirect về với status=success (xác thực lại với SePay PG API)
const confirmPayment = catchAsync(async (req, res) => {
  const { orderId } = req.body;

  if (!orderId) {
    return res.status(400).json({ success: false, message: 'orderId is required' });
  }

  const order = await findOrderByCodeOrId(orderId);
  if (!order) {
    return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
  }

  if (order.status === ORDER_STATUS.CANCELLED || order.status === ORDER_STATUS.REFUNDED) {
    return res.status(400).json({ success: false, message: 'Đơn hàng đã bị hủy hoặc hoàn trả' });
  }

  if (order.isPaid) {
    const populatedOrder = await populateOrderById(order._id);
    return res.status(200).json({
      success: true,
      message: 'Đơn hàng đã được xác nhận thanh toán trước đó',
      data: populatedOrder,
    });
  }

  if (order.paymentMethod !== PAYMENT_METHOD.TRANSFER) {
    return res.status(400).json({ success: false, message: 'Đơn hàng không phải thanh toán chuyển khoản' });
  }

  // Kiểm tra trạng thái thanh toán thực tế từ SePay PG Open API trước khi xác nhận
  let verification = await sepayService.verifySepayOrderPaid(order.code, order.total);
  if (!verification.verified && order.code !== String(order._id)) {
    verification = await sepayService.verifySepayOrderPaid(String(order._id), order.total);
  }

  if (!verification.verified) {
    return res.status(400).json({
      success: false,
      message: 'Giao dịch chưa được xác nhận thanh toán từ SePay. Vui lòng chờ đối soát.',
    });
  }

  const updateFields =
    order.status === ORDER_STATUS.PENDING
      ? { isPaid: true, status: ORDER_STATUS.CONFIRMED }
      : { isPaid: true };

  const updated = await Order.findOneAndUpdate(
    { _id: order._id, isPaid: false },
    { $set: updateFields },
    { new: true }
  );

  const populatedOrder = await populateOrderById((updated || order)._id);
  if (updated) {
    emitToAll('order_status_updated', populatedOrder);
    console.log(`Payment confirmed for order ${order.code} via SePay API verification.`);
  }

  res.status(200).json({
    success: true,
    message: 'Xác nhận thanh toán thành công',
    data: populatedOrder,
  });
});

module.exports = {
  createSepayPayment,
  sepayIPN,
  confirmPayment,
};

