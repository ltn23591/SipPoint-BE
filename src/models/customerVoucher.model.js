const mongoose = require('mongoose');

const customerVoucherSchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
    },
    // Nếu có một bảng Voucher chung thì liên kết vào đây, tạm thời lưu string
    voucherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Voucher', 
    },
    title: {
      type: String,
      required: true,
      trim: true, // VD: "Giảm 20% tổng hóa đơn"
    },
    expiryDate: {
      type: Date,
      required: true,
    },
    isUsed: {
      type: Boolean,
      default: false,
    },
    usedAt: {
      type: Date,
    },
    // Đơn hàng đã sử dụng voucher này
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
    },
    // Nguồn phát voucher vào ví
    source: {
      type: String,
      enum: ['POINTS_REDEEM', 'CAMPAIGN', 'ADMIN', 'LUCKY_WHEEL'],
      default: 'ADMIN',
    },
    // Campaign đã phát voucher này (nếu source = CAMPAIGN)
    campaignId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Campaign',
    },
  },
  {
    timestamps: true,
    collection: 'customer_vouchers',
  }
);

// Mỗi campaign chỉ phát tối đa 1 voucher cho mỗi khách hàng (chống phát trùng ở tầng DB)
customerVoucherSchema.index(
  { campaignId: 1, customerId: 1 },
  { unique: true, partialFilterExpression: { campaignId: { $exists: true } } }
);

module.exports = mongoose.model('CustomerVoucher', customerVoucherSchema);
