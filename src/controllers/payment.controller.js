const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const sepayService = require('../services/sepay.service');
const Order = require('../models/order.model');
const { ORDER_STATUS } = require('../enums');
const { emitToAll } = require('../services/socket.service');

const ORDER_ITEMS_POPULATE = {
  path: 'items',
  populate: { path: 'productId', select: 'name image price' },
};

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
    success: true,
    data: paymentData
  });
});

const sepayIPN = catchAsync(async (req, res) => {
  console.log('SePay IPN Request Body:', req.body);
  
  const { order_invoice_number, payment_status, content } = req.body;
  
  let isPaidSuccessful = false;
  let orderCodeOrId = '';

  // Trường hợp 1: Callback từ trang thanh toán hosted checkout
  if (order_invoice_number && (payment_status === 'SUCCESS' || payment_status === 'PAID')) {
    isPaidSuccessful = true;
    orderCodeOrId = order_invoice_number;
  }
  // Trường hợp 2: Webhook giao dịch chuyển khoản trực tiếp (quét VietQR)
  else if (content) {
    // Trích xuất mã đơn hàng (ví dụ: OD-485934-6138) từ nội dung chuyển khoản
    const match = content.match(/OD-\d{6}-\d{4}/i);
    if (match) {
      isPaidSuccessful = true;
      orderCodeOrId = match[0].toUpperCase();
    }
  }
  
  if (isPaidSuccessful && orderCodeOrId) {
    console.log(`SePay Payment successful for order: ${orderCodeOrId}`);
    
    // Tìm đơn hàng theo code hoặc _id
    let order = await Order.findOne({ code: orderCodeOrId });
    if (!order && orderCodeOrId.match(/^[0-9a-fA-F]{24}$/)) {
      order = await Order.findById(orderCodeOrId);
    }
    
    if (order) {
      order.isPaid = true;
      order.status = ORDER_STATUS.CONFIRMED;
      await order.save();

      if (order.customerId) {
        const CustomerService = require('../services/customer.service');
        await CustomerService.addPointsForOrder(order._id).catch(err => console.error('Lỗi tích điểm tự động:', err));
      }
      
      const populatedOrder = await Order.findById(order._id)
        .populate('tableId', 'name zoneId')
        .populate('customerId', 'fullName phone')
        .populate('createdBy', 'name email')
        .populate(ORDER_ITEMS_POPULATE);
        
      emitToAll('order_status_updated', populatedOrder);
      console.log(`Successfully updated order ${order.code} status to CONFIRMED (paid).`);
    } else {
      console.warn(`Order not found for SePay code/id: ${orderCodeOrId}`);
    }
  } else {
    console.log(`SePay webhook processed, no successful order payment detected.`);
  }

  // Phản hồi HTTP 200 OK cho SePay biết đã nhận được IPN
  res.status(200).json({ success: true });
});

// API cho Frontend gọi sau khi SePay redirect về với status=success
const confirmPayment = catchAsync(async (req, res) => {
  const { orderId } = req.body;
  
  if (!orderId) {
    return res.status(400).json({ success: false, message: 'orderId is required' });
  }

  // Tìm đơn hàng theo _id hoặc code
  let order = null;
  if (orderId.match(/^[0-9a-fA-F]{24}$/)) {
    order = await Order.findById(orderId);
  }
  if (!order) {
    order = await Order.findOne({ code: orderId });
  }

  if (!order) {
    return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
  }

  // Chỉ xác nhận nếu đơn hàng đang ở trạng thái PENDING và phương thức thanh toán là TRANSFER
  if (order.status !== ORDER_STATUS.PENDING) {
    return res.status(200).json({ success: true, message: 'Đơn hàng đã được xác nhận trước đó', data: order });
  }

  if (order.paymentMethod !== 'TRANSFER') {
    return res.status(400).json({ success: false, message: 'Đơn hàng không phải thanh toán chuyển khoản' });
  }

  order.isPaid = true;
  order.status = ORDER_STATUS.CONFIRMED;
  await order.save();

  const populatedOrder = await Order.findById(order._id)
    .populate('tableId', 'name zoneId')
    .populate('customerId', 'fullName phone')
    .populate('createdBy', 'name email')
    .populate(ORDER_ITEMS_POPULATE);

  emitToAll('order_status_updated', populatedOrder);
  console.log(`Payment confirmed for order ${order.code} via Frontend callback.`);

  res.status(200).json({ success: true, message: 'Xác nhận thanh toán thành công', data: populatedOrder });
});

module.exports = {
  createSepayPayment,
  sepayIPN,
  confirmPayment
};

