const mongoose = require('mongoose');
const { GAME_ACTIVITY_TYPE } = require('../enums');

// Cấu hình cấp lượt chơi khi khách hoàn thành một hoạt động.
const gameActivityConfigSchema = new mongoose.Schema(
  {
    gameId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Game',
      required: true,
    },
    activityType: {
      type: String,
      enum: Object.values(GAME_ACTIVITY_TYPE),
      required: true,
    },
    // Số lượt cấp mỗi lần hoàn thành hoạt động
    turnQuantity: {
      type: Number,
      default: 1,
      min: 1,
    },
    // Giới hạn số lượt cấp / ngày (VN). 0 hoặc null = không giới hạn.
    dailyLimit: {
      type: Number,
      min: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    collection: 'game_activity_configs',
  }
);

gameActivityConfigSchema.index({ gameId: 1, activityType: 1 });

module.exports = mongoose.model('GameActivityConfig', gameActivityConfigSchema);
