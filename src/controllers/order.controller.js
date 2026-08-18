const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const OrderService = require('../services/order.service');
const { ORDER_STATUS, ROLE } = require('../enums');

class OrderController {
  static getAll = catchAsync(async (req, res, next) => {
    const result = await OrderService.getAllOrders(req.query);
    res.status(200).json({
      success: true,
      message: 'Lấy danh sách đơn hàng thành công',
      data: result.orders,
      pagination: result.pagination,
    });
  });

  static getPaymentSummary = catchAsync(async (req, res, next) => {
    const data = await OrderService.getPaymentSummary(req.query);
    res.status(200).json({
      success: true,
      message: 'Lấy thông tin tổng quan thanh toán thành công',
      data,
    });
  });

  static getById = catchAsync(async (req, res, next) => {
    const data = await OrderService.getOrderById(req.params.id);
    res.status(200).json({
      success: true,
      message: 'Lấy chi tiết đơn hàng thành công',
      data,
    });
  });

  static create = catchAsync(async (req, res, next) => {
    const createdById = req.user ? req.user._id : null;
    const data = await OrderService.createOrder(req.body, createdById);
    res.status(201).json({
      success: true,
      message: 'Đặt đơn hàng thành công',
      data,
    });
  });

  static updateStatus = catchAsync(async (req, res, next) => {
    const { status, id, orderId, reason } = req.body;
    const targetId = req.params.id || id || orderId;
    const updatedById = req.user ? req.user._id : null;
    const userRole = req.user && req.user.roleId ? req.user.roleId.code : (req.user ? req.user.role : null);

    let data;
    let message = 'Cập nhật trạng thái đơn hàng thành công';
    if (status === ORDER_STATUS.CANCELLED) {
      if (userRole !== ROLE.ADMIN && userRole !== ROLE.CASHIER) {
        throw new AppError('Bạn không có quyền hủy đơn hàng', 403);
      }
      data = await OrderService.cancelOrder(targetId, reason, updatedById);
      message = 'Hủy đơn hàng thành công';
    } else {
      data = await OrderService.updateOrderStatus(targetId, status, updatedById);
    }
    res.status(200).json({
      success: true,
      message,
      data,
    });
  });

  static refund = catchAsync(async (req, res, next) => {
    const { reason } = req.body;
    const refundedById = req.user ? req.user._id : null;
    const data = await OrderService.refundOrder(req.params.id, reason, refundedById);
    res.status(200).json({
      success: true,
      message: 'Hoàn trả đơn hàng thành công',
      data,
    });
  });

  static getOrderStatus = catchAsync(async (req, res, next) => {
    const Order = require('../models/order.model');
    let order = null;
    const target = req.params.id;
    if (target.match(/^[0-9a-fA-F]{24}$/)) {
      order = await OrderService.getOrderById(target);
    } else {
      order = await Order.findOne({ code: target });
    }
    if (!order) throw new AppError('Không tìm thấy đơn hàng', 404);

    res.status(200).json({
      success: true,
      data: {
        _id: order._id,
        code: order.code,
        status: order.status,
        isPaid: order.isPaid,
        total: order.total,
      },
    });
  });
}

module.exports = OrderController;
