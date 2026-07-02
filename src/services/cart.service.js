const Cart = require('../models/cart.model');
const Product = require('../models/product.model');

class CartService {
  /**
   * Helper to check if two sets of variants are identical
   */
  static areVariantsEqual(var1 = [], var2 = []) {
    if (var1.length !== var2.length) return false;
    
    const ids1 = var1.map(v => v.variantId ? v.variantId.toString() : '').sort();
    const ids2 = var2.map(v => v.variantId ? v.variantId.toString() : '').sort();
    
    return ids1.every((val, index) => val === ids2[index]);
  }

  /**
   * Get the cart for a customer, creating it if it doesn't exist.
   */
  static async getCart(customerId) {
    let cart = await Cart.findOne({ customerId }).populate({
      path: 'items.productId',
      select: 'name price image isActive isDeleted'
    });

    if (!cart) {
      cart = await Cart.create({ customerId, items: [] });
    }

    return {
      status: 200,
      success: true,
      message: 'Lấy thông tin giỏ hàng thành công',
      data: cart,
    };
  }

  /**
   * Add/merge an item into the customer's cart
   */
  static async addToCart(customerId, itemData) {
    const { productId, qty = 1, variants = [], note = '' } = itemData;

    // Validate product
    const product = await Product.findById(productId);
    if (!product || product.isDeleted || product.isActive === 0) {
      return { status: 404, success: false, message: 'Sản phẩm không tồn tại hoặc đã ngừng kinh doanh' };
    }

    let cart = await Cart.findOne({ customerId });
    if (!cart) {
      cart = new Cart({ customerId, items: [] });
    }

    // Search for an existing item with the same productId and variants
    const existingIndex = cart.items.findIndex(
      (item) =>
        item.productId.toString() === productId &&
        this.areVariantsEqual(item.variants, variants)
    );

    if (existingIndex > -1) {
      // Merge quantity
      cart.items[existingIndex].qty += Number(qty);
      if (note) {
        cart.items[existingIndex].note = note; // update note if provided
      }
    } else {
      // Add new item
      cart.items.push({
        productId,
        qty: Number(qty),
        variants,
        note,
      });
    }

    await cart.save();
    
    // Return populated cart
    return this.getCart(customerId);
  }

  /**
   * Update quantity of a specific item in the cart
   */
  static async updateCartItemQty(customerId, itemData) {
    const { productId, variants = [], qty } = itemData;

    let cart = await Cart.findOne({ customerId });
    if (!cart) {
      return { status: 404, success: false, message: 'Không tìm thấy giỏ hàng của bạn' };
    }

    const itemIndex = cart.items.findIndex(
      (item) =>
        item.productId.toString() === productId &&
        this.areVariantsEqual(item.variants, variants)
    );

    if (itemIndex === -1) {
      return { status: 404, success: false, message: 'Không tìm thấy sản phẩm trong giỏ hàng' };
    }

    const targetQty = Number(qty);
    if (targetQty <= 0) {
      // Remove item
      cart.items.splice(itemIndex, 1);
    } else {
      cart.items[itemIndex].qty = targetQty;
    }

    await cart.save();
    return this.getCart(customerId);
  }

  /**
   * Remove a specific item from the cart
   */
  static async removeCartItem(customerId, itemData) {
    const { productId, variants = [] } = itemData;

    let cart = await Cart.findOne({ customerId });
    if (!cart) {
      return { status: 404, success: false, message: 'Không tìm thấy giỏ hàng của bạn' };
    }

    const itemIndex = cart.items.findIndex(
      (item) =>
        item.productId.toString() === productId &&
        this.areVariantsEqual(item.variants, variants)
    );

    if (itemIndex === -1) {
      return { status: 404, success: false, message: 'Không tìm thấy sản phẩm trong giỏ hàng' };
    }

    cart.items.splice(itemIndex, 1);
    await cart.save();
    return this.getCart(customerId);
  }

  /**
   * Clear the cart
   */
  static async clearCart(customerId) {
    let cart = await Cart.findOne({ customerId });
    if (!cart) {
      cart = new Cart({ customerId, items: [] });
    } else {
      cart.items = [];
    }
    await cart.save();
    return this.getCart(customerId);
  }
}

module.exports = CartService;
