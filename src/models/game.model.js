const mongoose = require('mongoose');
const { GAME_STATUS, GAME_RUNTIME_PHASE } = require('../enums');

// Trò chơi may mắn (Lucky Game) - aggregate root.
// Cấu hình ô thưởng / phân bổ / hoạt động cấp lượt nằm ở các collection riêng
// (gameReward, gameRewardDistribution, gameActivityConfig) để cập nhật kho atomic.
const gameSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true, // VD: "Vòng quay Tết 2026"
    },
    description: {
      type: String,
      trim: true,
    },
    // Ảnh nền + ảnh bánh xe
    backgroundUrl: {
      type: String,
      trim: true,
    },
    gameUrl: {
      type: String,
      trim: true,
    },
    // Thể lệ (rich text)
    content: {
      type: String,
    },
    startDate: {
      type: Date,
    },
    endDate: {
      type: Date,
      required: true,
    },
    // Cửa sổ giờ trong ngày (giờ VN), định dạng "HH:mm". Bỏ trống = cả ngày.
    timeFrom: {
      type: String,
      trim: true,
    },
    timeTo: {
      type: String,
      trim: true,
    },
    // Trạng thái vòng đời - trục sự thật DUY NHẤT (không dùng cờ isActive)
    status: {
      type: String,
      enum: Object.values(GAME_STATUS),
      default: GAME_STATUS.DRAFT,
    },
    // Các nhóm khách hàng (segment) được áp dụng trò chơi
    appliedSegmentIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'CustomerSegment' }],
    // Số lượt chơi khởi tạo cho khách mới (auto-seed khi khách xem lượt lần đầu)
    defaultTurnCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Cho phép khách dùng điểm tích lũy để đổi thêm lượt chơi
    isExchangeTurnEnabled: {
      type: Boolean,
      default: false,
    },
    // Số điểm cần để đổi 1 lượt chơi (bắt buộc khi isExchangeTurnEnabled = true)
    turnRewardAmount: {
      type: Number,
      min: 0,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
    },
  },
  {
    timestamps: true,
    collection: 'games',
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual populate: ô thưởng, dòng phân bổ, cấu hình cấp lượt
gameSchema.virtual('rewards', {
  ref: 'GameReward',
  localField: '_id',
  foreignField: 'gameId',
});
gameSchema.virtual('distributions', {
  ref: 'GameRewardDistribution',
  localField: '_id',
  foreignField: 'gameId',
});
gameSchema.virtual('activityConfigs', {
  ref: 'GameActivityConfig',
  localField: '_id',
  foreignField: 'gameId',
});

// Pha vận hành - suy ra từ ngày, chỉ hiển thị. Chỉ có ý nghĩa khi status = PUBLISHED.
gameSchema.virtual('runtimePhase').get(function () {
  if (this.status !== GAME_STATUS.PUBLISHED) return null;
  const now = new Date();
  if (this.startDate && this.startDate > now) return GAME_RUNTIME_PHASE.SCHEDULED;
  return GAME_RUNTIME_PHASE.RUNNING;
});

gameSchema.index({ status: 1 });

module.exports = mongoose.model('Game', gameSchema);
