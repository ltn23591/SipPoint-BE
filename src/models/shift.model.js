const mongoose = require('mongoose');
const { SHIFT_STATUS } = require('../enums');

const shiftSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
    },
    startTime: {
      type: Date,
      required: true,
      default: Date.now,
    },
    endTime: {
      type: Date,
    },
    startingCash: {
      type: Number,
      required: true,
      default: 0,
    },
    actualEndingCash: {
      type: Number,
      default: 0,
    },
    systemEndingCash: {
      type: Number,
      default: 0,
    },
    totalRevenue: {
      type: Number,
      default: 0,
    },
    totalOrders: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: Object.values(SHIFT_STATUS),
      default: SHIFT_STATUS.OPEN,
    },
    note: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Shift', shiftSchema);
