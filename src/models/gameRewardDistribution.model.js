const mongoose = require('mongoose');

// Dòng phân bổ phần thưởng theo nhóm khách hàng (allocation line).
// Chỉ khách thuộc segmentId mới đủ điều kiện trúng ô này qua dòng phân bổ này.
const gameRewardDistributionSchema = new mongoose.Schema(
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
    segmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CustomerSegment',
      required: true,
    },
    // Xác suất trúng (%) - dùng dựng bucket
    rate: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    // Tổng số lượng dòng này được trao
    maxQuantity: {
      type: Number,
      required: true,
      min: 0,
    },
    // Còn lại (khởi tạo = maxQuantity). Giảm atomic khi trúng.
    remainingQuantity: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Cửa sổ hiệu lực (cả 2 null = luôn; đúng 1 null = không hiệu lực)
    dateFrom: {
      type: Date,
    },
    dateTo: {
      type: Date,
    },
    // Thứ tự dựng bucket xác suất
    displayOrder: {
      type: Number,
      default: 0,
    },
    // false = trúng qua dòng này tối đa 1 lần/khách
    allowManyTimes: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    collection: 'game_reward_distributions',
  }
);

gameRewardDistributionSchema.index({ gameId: 1 });

module.exports = mongoose.model('GameRewardDistribution', gameRewardDistributionSchema);
