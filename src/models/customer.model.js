const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema(
  {
    customerId: {
      type: String,
      unique: true,
      trim: true,
    },
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
      required: true,
      unique: true,
      trim: true,
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
