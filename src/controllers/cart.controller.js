const CartService = require('../services/cart.service');

class CartController {
  static async get(req, res) {
    try {
      const result = await CartService.getCart(req.user.id);
      res.status(result.status).json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async add(req, res) {
    try {
      const result = await CartService.addToCart(req.user.id, req.body);
      res.status(result.status).json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async updateQty(req, res) {
    try {
      const result = await CartService.updateCartItemQty(req.user.id, req.body);
      res.status(result.status).json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async remove(req, res) {
    try {
      const result = await CartService.removeCartItem(req.user.id, req.body);
      res.status(result.status).json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async clear(req, res) {
    try {
      const result = await CartService.clearCart(req.user.id);
      res.status(result.status).json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}

module.exports = CartController;
