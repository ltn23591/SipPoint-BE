const mongoose = require('mongoose');
const { LUCKY_WHEEL_STATUS, WHEEL_TARGET_TYPE } = require('../enums');

const luckyWheelSchema = new mongoose.Schema(
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
    status: {
      type: String,
      enum: Object.values(LUCKY_WHEEL_STATUS),
      default: LUCKY_WHEEL_STATUS.DRAFT,
    },
    startDate: {
      type: Date,
    },
    endDate: {
      type: Date,
      required: true,
    },
    // Phạm vi khách hàng áp dụng (phân bổ giải thưởng theo nhóm KH)
    targetType: {
      type: String,
      enum: Object.values(WHEEL_TARGET_TYPE),
      default: WHEEL_TARGET_TYPE.ALL,
    },
    // Dùng khi targetType = SEGMENT
    segmentIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'CustomerSegment' }],
    // Dùng khi targetType = TIER
    tierIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'MembershipTier' }],
    // Giới hạn số lượt quay / khách (0 = không giới hạn)
    spinLimitPerCustomer: {
      type: Number,
      default: 1,
      min: 0,
    },
    // Số điểm cần để thực hiện 1 lượt quay (0 = miễn phí)
    spinCost: {
      type: Number,
      default: 0,
      min: 0,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
    },
  },
  {
    timestamps: true,
    collection: 'lucky_wheels',
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual populate danh sách ô giải thưởng
luckyWheelSchema.virtual('slots', {
  ref: 'LuckyWheelSlot',
  localField: '_id',
  foreignField: 'wheelId',
});

luckyWheelSchema.index({ status: 1 });

module.exports = mongoose.model('LuckyWheel', luckyWheelSchema);
