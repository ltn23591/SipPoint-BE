const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'userModel',
      required: true,
    },
    userModel: {
      type: String,
      required: true,
      enum: ['Employee', 'Customer'],
      default: 'Employee',
    },
    code: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ['register', 'two_factor', 'reset_password'],
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      expires: 300, // Tự động xóa sau 5 phút (300 giây)
    },
  },
  {
    timestamps: true,
  }
);

otpSchema.index({ userId: 1, code: 1, type: 1 });

const OTP = mongoose.model('OTP', otpSchema);

module.exports = OTP;
