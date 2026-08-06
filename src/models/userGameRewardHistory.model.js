const mongoose = require('mongoose');
const { GAME_REWARD_TYPE } = require('../enums');

// Một dòng cho mỗi lần khách trúng 1 ô. Snapshot phần thưởng tại thời điểm trúng.
const userGameRewardHistorySchema = new mongoose.Schema(
  {
    gameId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Game',
      required: true,
    },
    gameRewardId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'GameReward',
      required: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
    },
    // Dòng phân bổ đã dùng. null = trúng qua ô mặc định / fallback (không tiêu 1 dòng phân bổ).
    distributionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'GameRewardDistribution',
    },
    // Snapshot
    displayName: { type: String, trim: true },
    type: {
      type: String,
      enum: Object.values(GAME_REWARD_TYPE),
      required: true,
    },
    voucherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Voucher' },
    rewardValue: { type: Number },
    message: { type: String, trim: true },
    quantity: { type: Number, default: 1 },
    index: { type: Number, default: 0 },
    // Voucher đã phát vào ví (nếu type = VOUCHER)
    customerVoucherId: { type: mongoose.Schema.Types.ObjectId, ref: 'CustomerVoucher' },
    wonAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    collection: 'user_game_reward_histories',
  }
);

userGameRewardHistorySchema.index({ customerId: 1, gameId: 1 });

module.exports = mongoose.model('UserGameRewardHistory', userGameRewardHistorySchema);
