const mongoose = require('mongoose');
const { PRIZE_TYPE } = require('../enums');

// Một ô (slot) trên vòng quay = một phần thưởng + tỉ lệ trúng + kho quà.
const luckyWheelSlotSchema = new mongoose.Schema(
  {
    wheelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LuckyWheel',
      required: true,
    },
    label: {
      type: String,
      required: true,
      trim: true, // VD: "Giảm 20%", "+50 điểm", "Chúc may mắn"
    },
    color: {
      type: String,
      trim: true,
    },
    prizeType: {
      type: String,
      enum: Object.values(PRIZE_TYPE),
      required: true,
    },
    // Khi prizeType = VOUCHER
    voucherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Voucher',
    },
    // Khi prizeType = POINTS
    points: {
      type: Number,
      min: 0,
      default: 0,
    },
    // Tỉ lệ trúng (%). Tổng các slot của 1 vòng quay = 100.
    probability: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    // Giới hạn kho quà (0 = không giới hạn)
    stockLimit: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Số quà đã phát của ô này
    stockUsed: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
    collection: 'lucky_wheel_slots',
  }
);

luckyWheelSlotSchema.index({ wheelId: 1 });

module.exports = mongoose.model('LuckyWheelSlot', luckyWheelSlotSchema);
