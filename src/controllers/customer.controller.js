const catchAsync = require('../utils/catchAsync');
const CustomerService = require('../services/customer.service');
const OrderService = require('../services/order.service');

class CustomerController {
  static getAll = catchAsync(async (req, res, next) => {
      const result = await CustomerService.getAllCustomers(req.query);
      res.status(result.status || 200).json(result);
    });

  static getById = catchAsync(async (req, res, next) => {
      const result = await CustomerService.getCustomerById(req.params.id);
      res.status(result.status || 200).json(result);
    });

  static getMyPointHistory = catchAsync(async (req, res, next) => {
      const result = await CustomerService.getMyPointHistory(req.user.id);
      res.status(result.status || 200).json(result);
    });

  static create = catchAsync(async (req, res, next) => {
      const result = await CustomerService.createCustomer(req.body);
      res.status(result.status || 200).json(result);
    });

  static updateMyProfile = catchAsync(async (req, res, next) => {
      const result = await CustomerService.updateMyProfile(req.user.id, req.body);
      res.status(result.status || 200).json(result);
    });

  static getMyVouchers = catchAsync(async (req, res, next) => {
      const result = await CustomerService.getMyVouchers(req.user.id);
      res.status(result.status || 200).json(result);
    });

  static update = catchAsync(async (req, res, next) => {
      const result = await CustomerService.updateCustomer(req.params.id, req.body);
      res.status(result.status || 200).json(result);
    });

  static getMyOrders = catchAsync(async (req, res, next) => {
      const result = await OrderService.getAllOrders({ customerId: req.user.id, limit: 50 });
      res.status(result.status || 200).json(result);
    });

  static getMyOrderById = catchAsync(async (req, res, next) => {
      const result = await OrderService.getOrderById(req.params.orderId);
      if (result.success && result.data.customerId && result.data.customerId._id.toString() !== req.user.id.toString()) {
        return res.status(403).json({ success: false, message: 'Bạn không có quyền xem đơn hàng này' });
      }
      res.status(result.status || 200).json(result);
    });

  static createMyOrder = catchAsync(async (req, res, next) => {
      const orderData = {
        ...req.body,
        customerId: req.user.id
      };
      const result = await OrderService.createOrder(orderData, null);
      res.status(result.status || 200).json(result);
    });

  static adjustPoints = catchAsync(async (req, res, next) => {
      const { pointsChange, title, description, transactionType } = req.body;
      const result = await CustomerService.adjustPoints(
        req.params.id,
        pointsChange,
        title,
        description,
        transactionType
      );
      res.status(result.status || 200).json(result);
    });

  static recomputeCounters = catchAsync(async (req, res, next) => {
      const result = await CustomerService.recomputeCounters();
      res.status(result.status || 200).json(result);
    });
}

module.exports = CustomerController;
