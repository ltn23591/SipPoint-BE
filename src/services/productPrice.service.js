const ProductPrice = require('../models/productPrice.model');
const Product = require('../models/product.model');
const AppError = require('../utils/AppError');

class ProductPriceService {
  static async searchProductPrices(payload) {
    const page = parseInt(payload.page || 1, 10);
    const limit = parseInt(payload.pageSize || payload.limit || 10, 10);
    const skip = (page - 1) * limit;
    const search = payload.search || payload.keyword || '';

    let filter = {};
    if (search) {
      // Find matching products first
      const products = await Product.find({
        name: { $regex: search, $options: 'i' },
      }).select('_id');
      const productIds = products.map(p => p._id);
      filter.productId = { $in: productIds };
    }

    const items = await ProductPrice.find(filter)
      .populate('productId')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await ProductPrice.countDocuments(filter);

    return {
      status: 200,
      success: true,
      message: 'Tìm kiếm bảng giá sản phẩm thành công',
      data: items,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async createOrUpdateProductPrice(data) {
    const { productId, price, sizePriceMap, notes } = data;
    if (!productId) {
      throw new AppError('Thiếu productId', 400);
    }

    let productPrice = await ProductPrice.findOne({ productId });
    if (productPrice) {
      productPrice.price = price !== undefined ? price : productPrice.price;
      productPrice.sizePriceMap = sizePriceMap || productPrice.sizePriceMap;
      productPrice.notes = notes !== undefined ? notes : productPrice.notes;
      await productPrice.save();
    } else {
      productPrice = await ProductPrice.create({
        productId,
        price,
        sizePriceMap,
        notes,
      });
    }

    // Optionally update base price in Product model too for synchronization!
    if (price !== undefined) {
      await Product.findByIdAndUpdate(productId, { price });
    }

    return productPrice;
  }

  static async getProductPriceById(id) {
    // Try finding by ProductPrice ID first, fallback to finding by productId
    let item = await ProductPrice.findById(id).populate('productId');
    if (!item) {
      item = await ProductPrice.findOne({ productId: id }).populate('productId');
    }
    return item;
  }
}

module.exports = ProductPriceService;
