const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      required: false,
      unique: true,
      sparse: true,
      trim: true,
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true,
    },
    avatar: {
      type: String,
      default: '',
    },
    dateOfBirth: {
      type: Date,
    },
    tierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MembershipTier',
      required: false,
    },
    currentPoints: {
      type: Number,
      default: 0,
    },
    // Điểm tích trong chu kỳ hạng hiện tại (12 tháng) - dùng để xét thăng/duy trì hạng.
    // Chỉ giao dịch ORDER cộng và REFUND trừ; đổi điểm lấy quà (REWARD) không ảnh hưởng.
    cyclePoints: {
      type: Number,
      default: 0,
    },
    tierAchievedAt: {
      type: Date,
    },
    tierExpiresAt: {
      type: Date,
    },
    lastVisitAt: {
      type: Date,
    },
    totalSpent: {
      type: Number,
      default: 0,
    },
    password: {
      type: String,
      select: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true, // Tự động tạo trường createdAt (Ngày tham gia) và updatedAt
    collection: 'customers',
  }
);

module.exports = mongoose.model('Customer', customerSchema);
