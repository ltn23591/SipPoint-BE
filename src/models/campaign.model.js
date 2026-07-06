const mongoose = require('mongoose');
const { CAMPAIGN_STATUS } = require('../enums');

const campaignSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true, // VD: "Chiến dịch Tri ân Sinh nhật Tháng 7"
    },
    description: {
      type: String,
      trim: true,
    },
    // Nhóm khách hàng mục tiêu (Luồng 3)
    segmentIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CustomerSegment',
        required: true,
      },
    ],
    // Voucher phát hành (Luồng 2)
    voucherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Voucher',
      required: true,
    },
    // Điều kiện bổ sung kiểm tra tại thời điểm sử dụng voucher
    conditions: {
      // Ghi đè giá trị đơn tối thiểu của voucher (null = dùng của voucher)
      minOrderValue: { type: Number, min: 0 },
      // Khung giờ vàng được áp dụng (giờ VN, 0-23). VD: 14h-16h
      timeWindow: {
        startHour: { type: Number, min: 0, max: 23 },
        endHour: { type: Number, min: 0, max: 23 },
      },
    },
    status: {
      type: String,
      enum: Object.values(CAMPAIGN_STATUS),
      default: CAMPAIGN_STATUS.DRAFT,
    },
    startDate: {
      type: Date,
    },
    endDate: {
      type: Date,
      required: true,
    },
    // Số voucher đã phát vào ví khi kích hoạt
    issuedCount: {
      type: Number,
      default: 0,
    },
    activatedAt: {
      type: Date,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
    },
  },
  {
    timestamps: true,
    collection: 'campaigns',
  }
);

module.exports = mongoose.model('Campaign', campaignSchema);
