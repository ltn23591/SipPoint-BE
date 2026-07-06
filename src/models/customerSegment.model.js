const mongoose = require('mongoose');
const { IS_ACTIVE } = require('../enums');

const customerSegmentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true, // VD: "Khách VIP có sinh nhật tháng 7"
    },
    description: {
      type: String,
      trim: true,
    },
    // Bộ tiêu chí lọc động (kết hợp AND giữa các tiêu chí có giá trị)
    criteria: {
      // Thuộc một trong các hạng thành viên
      tierIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'MembershipTier' }],
      // Tháng sinh nhật (1-12)
      birthdayMonth: { type: Number, min: 1, max: 12 },
      // Số dư điểm tối thiểu
      minPoints: { type: Number, min: 0 },
      // Số ngày chưa ghé quán (tính từ lastVisitAt): >= min và/hoặc <= max
      minDaysSinceLastVisit: { type: Number, min: 0 },
      maxDaysSinceLastVisit: { type: Number, min: 0 },
    },
    // Danh sách thành viên đã materialize (đồng bộ qua cron hằng ngày hoặc sync thủ công)
    memberIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Customer' }],
    memberCount: {
      type: Number,
      default: 0,
    },
    lastSyncedAt: {
      type: Date,
    },
    isActive: {
      type: String,
      enum: [IS_ACTIVE.FALSE, IS_ACTIVE.TRUE],
      default: IS_ACTIVE.TRUE,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
    },
  },
  {
    timestamps: true,
    collection: 'customer_segments',
  }
);

module.exports = mongoose.model('CustomerSegment', customerSegmentSchema);
