const mongoose = require('mongoose');
const { IS_ACTIVE } = require('../enums');

const feedbackSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      unique: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      default: null,
    },
    customerName: {
      type: String,
      trim: true,
      default: 'Khách hàng',
    },
    customerPhone: {
      type: String,
      trim: true,
      default: '',
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: '',
    },
    adminReply: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: '',
    },
    repliedAt: {
      type: Date,
      default: null,
    },
    repliedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      default: null,
    },
    bonusPointsAwarded: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: String,
      enum: Object.values(IS_ACTIVE),
      default: IS_ACTIVE.TRUE,
    },
  },
  {
    timestamps: true,
  }
);

feedbackSchema.index({ rating: 1, createdAt: -1 });
feedbackSchema.index({ customerId: 1, createdAt: -1 });

module.exports = mongoose.model('Feedback', feedbackSchema);

