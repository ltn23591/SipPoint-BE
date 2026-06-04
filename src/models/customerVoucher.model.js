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
  },
  {
    timestamps: true,
    collection: 'customer_vouchers',
  }
);

module.exports = mongoose.model('CustomerVoucher', customerVoucherSchema);
