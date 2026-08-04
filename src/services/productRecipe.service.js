const ProductRecipe = require('../models/productRecipe.model');
const Product = require('../models/product.model');
const Material = require('../models/material.model');
const AppError = require('../utils/AppError');

class ProductRecipeService {
  /**
   * Lấy công thức của một sản phẩm (kèm thông tin nguyên liệu)
   */
  static async getByProduct(productId) {
    const recipe = await ProductRecipe.findOne({ productId })
      .populate('productId', 'name image price')
      .populate('items.materialId', 'name unit onHand status');
    return recipe;
  }

  /**
   * Tạo mới hoặc cập nhật công thức cho sản phẩm (mỗi sản phẩm một công thức duy nhất)
   */
  static async upsert(productId, items, employeeId) {
    const product = await Product.findById(productId);
    if (!product || product.isDeleted) {
      throw new AppError('Không tìm thấy sản phẩm', 404);
    }

    if (!Array.isArray(items) || items.length === 0) {
      throw new AppError('Công thức phải có ít nhất một nguyên liệu', 400);
    }

    // Chuẩn hóa & kiểm tra từng dòng định mức
    const normalizedItems = [];
    const seen = new Set();
    for (const item of items) {
      if (!item.materialId) {
        throw new AppError('Thiếu mã nguyên liệu trong công thức', 400);
      }
      const quantity = Number(item.quantity);
      if (isNaN(quantity) || quantity <= 0) {
        throw new AppError('Định mức nguyên liệu phải lớn hơn 0', 400);
      }
      if (seen.has(String(item.materialId))) {
        throw new AppError('Một nguyên liệu chỉ được khai báo một lần trong công thức', 400);
      }
      seen.add(String(item.materialId));

      const material = await Material.findOne({ _id: item.materialId, isDeleted: false });
      if (!material) {
        throw new AppError(`Nguyên liệu với ID ${item.materialId} không tồn tại`, 404);
      }

      normalizedItems.push({ materialId: material._id, quantity });
    }

    const recipe = await ProductRecipe.findOneAndUpdate(
      { productId },
      {
        productId,
        items: normalizedItems,
        updatedBy: employeeId || null,
        $setOnInsert: { createdBy: employeeId || null },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    ).populate('items.materialId', 'name unit onHand status');

    return recipe;
  }

  /**
   * Xóa công thức của một sản phẩm
   */
  static async remove(productId) {
    return await ProductRecipe.findOneAndDelete({ productId });
  }
}

module.exports = ProductRecipeService;
