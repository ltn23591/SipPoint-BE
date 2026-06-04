const mongoose = require('mongoose');

const productVariantSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    // Ví dụ: 0: SIZE, 1: TOPPING
    variantType: {
      type: Number,
      required: true,
      enum: [0, 1], // 0: SIZE, 1: TOPPING
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    priceAdjustment: {
      type: Number,
      required: true,
      default: 0,
    },
    isActive: {
      type: Number,
      enum: [0, 1], // 0: inactive, 1: active
      default: 1,
    },
  },
  {
    timestamps: true,
  }
);

// Tạo index để tối ưu hóa truy vấn biến thể theo sản phẩm
productVariantSchema.index({ product: 1, variantType: 1 });

const ProductVariant = mongoose.model('ProductVariant', productVariantSchema);

module.exports = ProductVariant;
