const mongoose = require('mongoose');
const { GAME_REWARD_TYPE } = require('../enums');

// Một ô (cell) trên trò chơi = một phần thưởng + kho quà.
const gameRewardSchema = new mongoose.Schema(
  {
    gameId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Game',
      required: true,
    },
    displayName: {
      type: String,
      required: true,
      trim: true, // VD: "Giảm 20%", "+50 điểm", "Chúc may mắn"
    },
    type: {
      type: String,
      enum: Object.values(GAME_REWARD_TYPE),
      required: true,
    },
    // Khi type = VOUCHER: trỏ tới 1 voucher đang active (loại quà giảm tiền/% lấy từ voucher.discountType)
    voucherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Voucher',
    },
    // Khi type = POINTS: số điểm thưởng
    rewardValue: {
      type: Number,
      min: 0,
    },
    // Khi type = MESSAGE: lời chúc
    message: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    // Tổng kho cấu hình
    totalReward: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Tồn còn lại (khởi tạo = totalReward). Giảm atomic khi trúng.
    remainingReward: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Số đơn vị / lần trúng
    quantity: {
      type: Number,
      default: 1,
      min: 1,
    },
    // Ô mặc định (fallback "chúc may mắn"). Đúng 1 ô/ game, phải allowManyTimes.
    isDefault: {
      type: Boolean,
      default: false,
    },
    // false = mỗi khách trúng ô này tối đa 1 lần (đường default-wheel)
    allowManyTimes: {
      type: Boolean,
      default: true,
    },
    // Vị trí trên bánh xe (0-based)
    index: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    collection: 'game_rewards',
  }
);

gameRewardSchema.index({ gameId: 1 });

module.exports = mongoose.model('GameReward', gameRewardSchema);
