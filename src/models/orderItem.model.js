const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    qty: {
      type: Number,
      required: true,
      min: 1,
    },
    variants: [
      {
        variantId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'ProductVariant',
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
      },
    ],
    note: {
      type: String,
      trim: true,
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    // Snapshot định mức nguyên liệu tại thời điểm đặt (audit/đối soát nếu công thức thay đổi sau này).
    // quantityPerUnit: định mức cho 1 phần; totalQuantity = quantityPerUnit * qty.
    materials: [
      {
        _id: false,
        materialId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Material',
        },
        name: { type: String, trim: true },
        unit: { type: String, trim: true },
        quantityPerUnit: { type: Number, default: 0 },
        totalQuantity: { type: Number, default: 0 },
      },
    ],
  },
  { 
    timestamps: true,
    collection: 'orderitems'
  }
);

module.exports = {
  orderItemSchema,
  OrderItem: mongoose.model('OrderItem', orderItemSchema),
};
