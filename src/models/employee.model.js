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
    roleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'StaffRole',
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'active', 'banned'],
      default: 'active', // Default active for staff
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
