const OrderService = require('../services/order.service');
const { ORDER_STATUS, ROLE } = require('../enums');
class OrderController {
  static async getAll(req, res) {
    try {
      const result = await OrderService.getAllOrders(req.query);
      res.status(result.status).json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async getById(req, res) {
    try {
      const result = await OrderService.getOrderById(req.params.id);
      res.status(result.status).json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async create(req, res) {
    try {
      // Lấy id của nhân viên thực hiện (từ auth middleware)
      const createdById = req.user ? req.user._id : null;
      const result = await OrderService.createOrder(req.body, createdById);
      res.status(result.status).json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async updateStatus(req, res) {
    try {
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
      res.status(result.status).json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async refund(req, res) {
    try {
      const updatedById = req.user ? req.user._id : null;
      const result = await OrderService.refundOrder(req.params.id, req.body.reason, updatedById);
      res.status(result.status).json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}

module.exports = OrderController;
