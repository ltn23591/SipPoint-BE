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
    tier: {
      type: String,
      default: 'ĐỒNG',
    },
    currentPoints: {
      type: Number,
      default: 0,
    },
    totalSpent: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true, // Tự động tạo trường createdAt (Ngày tham gia) và updatedAt
    collection: 'customers',
  }
);


module.exports = mongoose.model('Customer', customerSchema);
