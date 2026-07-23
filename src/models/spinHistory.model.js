const mongoose = require('mongoose');
const { PRIZE_TYPE } = require('../enums');

// Nhật ký mỗi lượt quay (dùng để chống vượt số lượt & thống kê người trúng).
const spinHistorySchema = new mongoose.Schema(
  {
    wheelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LuckyWheel',
      required: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
    },
    slotId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LuckyWheelSlot',
      required: true,
    },
    prizeType: {
      type: String,
      enum: Object.values(PRIZE_TYPE),
      required: true,
    },
    prizeLabel: {
      type: String,
      trim: true,
    },
    // Phần thưởng đã phát (tuỳ prizeType)
    voucherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Voucher',
    },
    customerVoucherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CustomerVoucher',
    },
    points: {
      type: Number,
      default: 0,
    },
    spunAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    collection: 'spin_histories',
  }
);

spinHistorySchema.index({ wheelId: 1, customerId: 1 });

module.exports = mongoose.model('SpinHistory', spinHistorySchema);
