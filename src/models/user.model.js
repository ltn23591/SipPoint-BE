const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Vui lòng cung cấp tên người dùng'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Vui lòng cung cấp địa chỉ email'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Vui lòng cung cấp email hợp lệ'],
    },
    password: {
      type: String,
      required: [true, 'Vui lòng cung cấp mật khẩu'],
      minlength: [6, 'Mật khẩu phải chứa ít nhất 6 ký tự'],
      select: false, // Không trả về password khi truy vấn mặc định
    },
    role: {
      type: Number,
      enum: [0, 1, 2, 3, 4], // 0: user, 1: admin, 2: cashier, 3: barista, 4: waiter
      default: 0,
    },
    status: {
      type: Number,
      enum: [0, 1, 2], // 0: pending, 1: active, 2: banned
      default: 0,
    },
    isTwoFactorEnabled: {
      type: Boolean,
      default: false,
    },
    loginAttempts: {
      type: Number,
      required: true,
      default: 0,
    },
    lockUntil: {
      type: Date,
    },
    resetPasswordOTP: {
      type: String,
    },
    resetPasswordOTPExpire: {
      type: Date,
    },
    resetPasswordToken: {
      type: String,
    },
    resetPasswordTokenExpire: {
      type: Date,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

userSchema.index({ isDeleted: 1 });

const User = mongoose.model('User', userSchema);

module.exports = User;
