const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    content: {
      type: String,
      required: true,
    },
    recipientType: {
      type: String,
      enum: ['all', 'customer', 'staff', 'tier', 'segment'],
      default: 'all',
    },
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    tierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MembershipTier',
      default: null,
    },
    segmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CustomerSegment',
      default: null,
    },
    voucherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Voucher',
      default: null,
    },
    type: {
      type: String,
      enum: ['system', 'promotion', 'order', 'inventory'],
      default: 'system',
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Notification', notificationSchema);
