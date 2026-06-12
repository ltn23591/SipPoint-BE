const mongoose = require('mongoose');

const voucherSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    // Loại giảm giá: PERCENT (phần trăm) hoặc FIXED (tiền mặt cố định)
    discountType: {
      type: String,
      required: true,
      enum: ['PERCENT', 'FIXED'],
      default: 'PERCENT',
    },
    discountValue: {
      type: Number,
      required: true,
      min: 0,
    },
    // Giá trị đơn hàng tối thiểu để được áp dụng
    minOrderValue: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Mức giảm tối đa (thường áp dụng cho loại giảm giá PERCENTAGE)
    maxDiscountLimit: {
      type: Number,
      min: 0,
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    endDate: {
      type: Date,
      required: true,
    },
    // Số lượng phát hành tối đa
    usageLimit: {
      type: Number,
      required: true,
      min: 1,
    },
    // Số lượng đã được sử dụng
    usedCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    isActive: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
  },
  {
    timestamps: true,
    collection: 'vouchers',
  }
);

const Voucher = mongoose.model('Voucher', voucherSchema);

module.exports = Voucher;
