const catchAsync = require('../utils/catchAsync');
const OrderService = require('../services/order.service');
const { ORDER_STATUS, ROLE } = require('../enums');
class OrderController {
  static getAll = catchAsync(async (req, res, next) => {
      const result = await OrderService.getAllOrders(req.query);
      res.status(result.status || 200).json(result);
    });

  static getById = catchAsync(async (req, res, next) => {
      const result = await OrderService.getOrderById(req.params.id);
      res.status(result.status || 200).json(result);
    });

  static create = catchAsync(async (req, res, next) => {
      // Lấy id của nhân viên thực hiện (từ auth middleware)
      const createdById = req.user ? req.user._id : null;
      const result = await OrderService.createOrder(req.body, createdById);
      res.status(result.status || 200).json(result);
    });

  static updateStatus = catchAsync(async (req, res, next) => {
      const { status, id, orderId, reason } = req.body;
      const targetId = req.params.id || id || orderId;
      const updatedById = req.user ? req.user._id : null;
      const userRole = req.user && req.user.roleId ? req.user.roleId.code : (req.user ? req.user.role : null);
      
     

      let result;
      if (status === ORDER_STATUS.CANCELLED) {
        // Chỉ admin và cashier mới được quyền huỷ đơn
        if (userRole !== ROLE.ADMIN && userRole !== ROLE.CASHIER) {
          return res.status(403).json({ success: false, message: 'Bạn không có quyền hủy đơn hàng' });
        }
        result = await OrderService.cancelOrder(targetId, reason, updatedById);
      } else {
        result = await OrderService.updateOrderStatus(targetId, status, updatedById);
      }
      res.status(result.status || 200).json(result);
    });

  static refund = catchAsync(async (req, res, next) => {
      const updatedById = req.user ? req.user._id : null;
      const result = await OrderService.refundOrder(req.params.id, req.body.reason, updatedById);
      res.status(result.status || 200).json(result);
    });
}

module.exports = OrderController;
