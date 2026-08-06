const mongoose = require('mongoose');
const { GAME_ACTIVITY_TYPE } = require('../enums');

// Nhật ký cấp lượt chơi (audit + dùng để tính dailyLimit theo ngày VN).
const userTurnHistorySchema = new mongoose.Schema(
  {
    gameId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Game',
      required: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
    },
    // Nguồn cấp: hoạt động (ORDER_COMPLETED...) hoặc null nếu admin cấp thủ công
    activityType: {
      type: String,
      enum: Object.values(GAME_ACTIVITY_TYPE),
    },
    quantity: {
      type: Number,
      required: true,
    },
    note: {
      type: String,
      trim: true,
    },
    grantedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    collection: 'user_turn_histories',
  }
);

userTurnHistorySchema.index({ gameId: 1, customerId: 1, activityType: 1, grantedAt: 1 });

module.exports = mongoose.model('UserTurnHistory', userTurnHistorySchema);
