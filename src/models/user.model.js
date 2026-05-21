const mongoose = require('mongoose');

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       required:
 *         - name
 *         - email
 *         - password
 *       properties:
 *         _id:
 *           type: string
 *         name:
 *           type: string
 *         email:
 *           type: string
 *           format: email
 *         role:
 *           type: number
 *           enum: [0, 1]
 *           default: 0
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */
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
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        'Vui lòng cung cấp email hợp lệ',
      ],
    },
    password: {
      type: String,
      required: [true, 'Vui lòng cung cấp mật khẩu'],
      minlength: [6, 'Mật khẩu phải chứa ít nhất 6 ký tự'],
      select: false, // Không trả về password khi truy vấn mặc định
    },
    role: {
      type: Number,
      enum: [0, 1], // 0: user, 1: admin
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
    twoFactorOTP: {
      type: String,
    },
    twoFactorOTPExpire: {
      type: Date,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    verifyOTP: {
      type: String,
    },
    verifyOTPExpire: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model('User', userSchema);

module.exports = User;
