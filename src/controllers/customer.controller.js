const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const CustomerService = require('../services/customer.service');
const OrderService = require('../services/order.service');

class CustomerController {
  static getAll = catchAsync(async (req, res, next) => {
    const result = await CustomerService.getAllCustomers(req.query);
    res.status(200).json({
      success: true,
      message: 'Lấy danh sách khách hàng thành công',
      data: result.customers,
      pagination: result.pagination,
    });
  });

  static getById = catchAsync(async (req, res, next) => {
    const data = await CustomerService.getCustomerById(req.params.id);
    res.status(200).json({
      success: true,
      message: 'Lấy thông tin chi tiết khách hàng thành công',
      data,
    });
  });

  static getMyPointHistory = catchAsync(async (req, res, next) => {
    const result = await CustomerService.getMyPointHistory(req.user.id, req.query);
    res.status(200).json({
      success: true,
      message: 'Lấy lịch sử điểm thành công',
      data: result.pointHistories,
      pagination: result.pagination,
    });
  });

  static getAllPointHistories = catchAsync(async (req, res, next) => {
    const result = await CustomerService.getAllPointHistories(req.query);
    res.status(200).json({
      success: true,
      message: 'Lấy danh sách tất cả lịch sử giao dịch điểm thành công',
      data: result.pointHistories,
      pagination: result.pagination,
    });
  });

  static getPointHistory = catchAsync(async (req, res, next) => {
    const result = await CustomerService.getPointHistoryByAdmin(req.params.id, req.query);
    res.status(200).json({
      success: true,
      message: 'Lấy lịch sử điểm khách hàng thành công',
      data: result.pointHistories,
      pagination: result.pagination,
    });
  });

  static getVouchers = catchAsync(async (req, res, next) => {
    const data = await CustomerService.getVouchersByAdmin(req.params.id);
    res.status(200).json({
      success: true,
      message: 'Lấy danh sách voucher của khách hàng thành công',
      data,
    });
  });

  static create = catchAsync(async (req, res, next) => {
    const data = await CustomerService.createCustomer(req.body);
    res.status(201).json({
      success: true,
      message: 'Tạo khách hàng mới thành công',
      data,
    });
  });

  static updateMyProfile = catchAsync(async (req, res, next) => {
    const data = await CustomerService.updateMyProfile(req.user.id, req.body);
    res.status(200).json({
      success: true,
      message: 'Cập nhật thông tin cá nhân thành công',
      data,
    });
  });

  static getMyVouchers = catchAsync(async (req, res, next) => {
    const data = await CustomerService.getMyVouchers(req.user.id);
    res.status(200).json({
      success: true,
      message: 'Lấy danh sách voucher trong ví thành công',
      data,
    });
  });

  static update = catchAsync(async (req, res, next) => {
    const data = await CustomerService.updateCustomer(req.params.id, req.body);
    res.status(200).json({
      success: true,
      message: 'Cập nhật thông tin khách hàng thành công',
      data,
    });
  });

  static getMyOrders = catchAsync(async (req, res, next) => {
    const result = await OrderService.getAllOrders({ customerId: req.user.id, limit: 50 });
    res.status(200).json({
      success: true,
      message: 'Lấy danh sách đơn hàng thành công',
      data: result.orders,
      pagination: result.pagination,
    });
  });

  static getMyOrderById = catchAsync(async (req, res, next) => {
    const order = await OrderService.getOrderById(req.params.orderId);
    if (order.customerId && order.customerId._id.toString() !== req.user.id.toString()) {
      throw new AppError('Bạn không có quyền xem đơn hàng này', 403);
    }
    res.status(200).json({
      success: true,
      message: 'Lấy chi tiết đơn hàng thành công',
      data: order,
    });
  });

  static createMyOrder = catchAsync(async (req, res, next) => {
    const orderData = {
      ...req.body,
      customerId: req.user.id,
    };
    const data = await OrderService.createOrder(orderData, null);
    res.status(201).json({
      success: true,
      message: 'Đặt đơn hàng thành công',
      data,
    });
  });

  static adjustPoints = catchAsync(async (req, res, next) => {
    const { pointsChange, title, description, transactionType } = req.body;
    const data = await CustomerService.adjustPoints(
      req.params.id,
      pointsChange,
      title,
      description,
      transactionType
    );
    res.status(200).json({
      success: true,
      message: 'Điều chỉnh điểm tích lũy thành công',
      data,
    });
  });

  static recomputeCounters = catchAsync(async (req, res, next) => {
    const data = await CustomerService.recomputeCounters();
    res.status(200).json({
      success: true,
      message: 'Tính toán lại chỉ số khách hàng thành công',
      data,
    });
  });
}

module.exports = CustomerController;
