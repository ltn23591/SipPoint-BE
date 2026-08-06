const mongoose = require('mongoose');

// Số lượt chơi của 1 khách cho 1 trò chơi. remainingTurns giảm atomic mỗi lần quay.
const userTurnSchema = new mongoose.Schema(
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
    totalTurns: {
      type: Number,
      default: 0,
      min: 0,
    },
    usedTurns: {
      type: Number,
      default: 0,
      min: 0,
    },
    remainingTurns: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
    collection: 'user_turns',
  }
);

userTurnSchema.index({ gameId: 1, customerId: 1 }, { unique: true });

module.exports = mongoose.model('UserTurn', userTurnSchema);
