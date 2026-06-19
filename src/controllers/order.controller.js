const OrderService = require('../services/order.service');

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
      const { status, id, orderId } = req.body;
      const targetId = req.params.id || id || orderId;
      const updatedById = req.user ? req.user._id : null;
      const result = await OrderService.updateOrderStatus(targetId, status, updatedById);
      res.status(result.status).json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async cancel(req, res) {
    try {
      const { reason } = req.body;
      const updatedById = req.user ? req.user._id : null;
      const result = await OrderService.cancelOrder(req.params.id, reason, updatedById);
      res.status(result.status).json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async confirm(req, res) {
    try {
      const updatedById = req.user ? req.user._id : null;
      const result = await OrderService.confirmOrder(req.params.id, updatedById);
      res.status(result.status).json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async complete(req, res) {
    try {
      const updatedById = req.user ? req.user._id : null;
      const result = await OrderService.completeOrder(req.params.id, updatedById);
      res.status(result.status).json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}

module.exports = OrderController;
