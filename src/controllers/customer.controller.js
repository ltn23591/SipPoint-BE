const CustomerService = require('../services/customer.service');

class CustomerController {
  static async getAll(req, res) {
    try {
      const result = await CustomerService.getAllCustomers(req.query);
      res.status(result.status).json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async getById(req, res) {
    try {
      const result = await CustomerService.getCustomerById(req.params.id);
      res.status(result.status).json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async getMyPointHistory(req, res) {
    try {
      const result = await CustomerService.getMyPointHistory(req.user.id);
      res.status(result.status).json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async create(req, res) {
    try {
      const result = await CustomerService.createCustomer(req.body);
      res.status(result.status).json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async updateMyProfile(req, res) {
    try {
      const result = await CustomerService.updateMyProfile(req.user.id, req.body);
      res.status(result.status).json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async getMyVouchers(req, res) {
    try {
      const result = await CustomerService.getMyVouchers(req.user.id);
      res.status(result.status).json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async update(req, res) {
    try {
      const result = await CustomerService.updateCustomer(req.params.id, req.body);
      res.status(result.status).json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async getMyOrders(req, res) {
    try {
      const OrderService = require('../services/order.service');
      const result = await OrderService.getAllOrders({ customerId: req.user.id, limit: 50 });
      res.status(result.status).json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async getMyOrderById(req, res) {
    try {
      const OrderService = require('../services/order.service');
      const result = await OrderService.getOrderById(req.params.orderId);
      if (result.success && result.data.customerId && result.data.customerId._id.toString() !== req.user.id.toString()) {
        return res.status(403).json({ success: false, message: 'Bạn không có quyền xem đơn hàng này' });
      }
      res.status(result.status).json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async adjustPoints(req, res) {
    try {
      const { pointsChange, title, description, transactionType } = req.body;
      const result = await CustomerService.adjustPoints(
        req.params.id,
        pointsChange,
        title,
        description,
        transactionType
      );
      res.status(result.status).json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}

module.exports = CustomerController;
