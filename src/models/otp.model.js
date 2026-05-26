const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    code: {
      type: String,
      required: true,
    },
    type: {
      type: Number,
      enum: [0, 1, 2], // 0: REGISTER, 1: TWO_FACTOR, 2: RESET_PASSWORD
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
