const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const sepayService = require('../services/sepay.service');
const Order = require('../models/order.model');
const { ORDER_STATUS } = require('../enums');
const { emitToAll } = require('../services/socket.service');

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

const sepayIPN = catchAsync(async (req, res) => {
  console.log('SePay IPN Request Body:', req.body);
  
  const { order_invoice_number, payment_status } = req.body;
  
  if (payment_status === 'SUCCESS' || payment_status === 'PAID') {
    console.log(`SePay Payment successful for order ${order_invoice_number}`);
    
    // Tìm đơn hàng theo code hoặc _id
    let order = await Order.findOne({ code: order_invoice_number });
    if (!order && order_invoice_number.match(/^[0-9a-fA-F]{24}$/)) {
      order = await Order.findById(order_invoice_number);
    }
    
    if (order) {
      order.isPaid = true;
      order.status = ORDER_STATUS.CONFIRMED; // Chuyển khoản thành công -> trạng thái Đã nhận đơn (CONFIRMED)
      await order.save();
      
      // Lấy lại đơn hàng đầy đủ để đẩy socket thông báo thời gian thực cho Portal
      const populatedOrder = await Order.findById(order._id)
        .populate('tableId', 'name zoneId')
        .populate('customerId', 'fullName phone')
        .populate('createdBy', 'name email')
        .populate('items');
        
      emitToAll('order_status_updated', populatedOrder);
      console.log(`Successfully updated order ${order.code} status to CONFIRMED (paid).`);
    } else {
      console.warn(`Order not found for SePay invoice number: ${order_invoice_number}`);
    }
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
