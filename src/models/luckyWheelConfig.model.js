const mongoose = require('mongoose');

const luckyWheelConfigSchema = new mongoose.Schema(
  {
    slotIndex: {
      type: Number,
      required: true,
      unique: true, // 0-7
    },
    label: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      required: true,
      enum: ['VOUCHER', 'POINTS', 'LUCK'],
      default: 'LUCK',
    },
    voucherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Voucher',
      required: false,
    },
    value: {
      type: Number,
      default: 0,
    },
    probability: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
  },
  {
    timestamps: true,
    collection: 'lucky_wheel_configs',
  }
);

module.exports = mongoose.model('LuckyWheelConfig', luckyWheelConfigSchema);
