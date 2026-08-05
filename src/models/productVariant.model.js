const mongoose = require('mongoose');
const { IS_ACTIVE } = require('../enums');

const productVariantSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
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
    variantType: {
      type: String,
      enum: ['size', 'topping'],
      default: 'size',
    },
    isActive: {
      type: String,
      enum: [IS_ACTIVE.FALSE, IS_ACTIVE.TRUE],
      default: IS_ACTIVE.TRUE,
    },
  },
  {
    timestamps: true,
  }
);

// Tạo index để tối ưu hóa truy vấn biến thể theo sản phẩm
productVariantSchema.index({ product: 1 });

const ProductVariant = mongoose.model('ProductVariant', productVariantSchema);

module.exports = ProductVariant;
