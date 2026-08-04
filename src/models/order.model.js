const mongoose = require('mongoose');
const { ORDER_STATUS, IS_ACTIVE, PAYMENT_METHOD } = require('../enums');

const orderSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    orderNumber: {
      type: String,
      trim: true,
    },
    tableId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Table',
      required: false,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: false,
    },
    voucherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Voucher',
      required: false,
    },
    // Voucher trong ví khách hàng được sử dụng cho đơn này (nếu có)
    customerVoucherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CustomerVoucher',
      required: false,
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    discount: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    total: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    // Số điểm đã cộng cho khách khi đơn COMPLETED (mốc idempotency cho refund)
    pointsAwarded: {
      type: Number,
      default: 0,
    },
    // Snapshot lượng nguyên liệu đã tạm giữ (hold) cho đơn - dùng để commit/rollback tồn kho.
    // Chỉ phát sinh với sản phẩm có công thức; sản phẩm không công thức vẫn dùng product.stock.
    materialHolds: [
      {
        _id: false,
        materialId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Material',
        },
        quantity: { type: Number, default: 0 },
      },
    ],
    isUrgent: {
      type: Boolean,
      default: false,
    },
    isPaid: {
      type: Boolean,
      default: false,
    },
    paymentMethod: {
      type: String,
      enum: Object.values(PAYMENT_METHOD),
      default: PAYMENT_METHOD.CASH,
    },
    isPickup: {
      type: Boolean,
      default: false,
    },
    type: {
      type: String,
      enum: ['dine_in', 'takeaway', 'delivery', 'counter'],
      default: 'dine_in',
    },
    status: {
      type: String,
      enum: Object.values(ORDER_STATUS),
      default: ORDER_STATUS.PENDING,
    },
    note: {
      type: String,
      trim: true,
    },
    isActive: {
      type: String,
      enum: [IS_ACTIVE.FALSE, IS_ACTIVE.TRUE],
      default: IS_ACTIVE.TRUE,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: false,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: false,
    },
  },
  {
    timestamps: true,
    collection: 'orders',
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual populate for order items
orderSchema.virtual('items', {
  ref: 'OrderItem',
  localField: '_id',
  foreignField: 'orderId',
});

// Virtual for VietQR payment link
orderSchema.virtual('paymentQrUrl').get(function () {
  return `https://img.vietqr.io/image/VCB-1030501667-compact.png?amount=${this.total}&addInfo=${this.code}`;
});

orderSchema.index({ status: 1 });
orderSchema.index({ tableId: 1 });
orderSchema.index({ customerId: 1 });
orderSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Order', orderSchema);
