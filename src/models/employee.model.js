const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
    role: {
      type: Number,
      enum: [1, 2, 3, 4], // 1: admin, 2: cashier, 3: barista, 4: waiter (no 0: user/customer)
      required: true,
    },
    status: {
      type: Number,
      enum: [0, 1, 2], // 0: pending, 1: active, 2: banned
      default: 1, // Default active for staff
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

employeeSchema.index({ isDeleted: 1 });

const Employee = mongoose.model('Employee', employeeSchema);

module.exports = Employee;
