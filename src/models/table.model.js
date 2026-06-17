const mongoose = require('mongoose');
const { IS_ACTIVE, TABLE_STATUS } = require('../enums');

const tableSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    zoneId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Zone',
      required: true,
    },
    capacity: {
      type: Number,
      default: 4,
    },
    status: {
      type: String,
      enum: [TABLE_STATUS.AVAILABLE, TABLE_STATUS.OCCUPIED, TABLE_STATUS.RESERVED, TABLE_STATUS.CLEANING],
      default: TABLE_STATUS.AVAILABLE,
    },
    qrCode: {
      type: String,
    },
    isActive: {
      type: String,
      enum: [IS_ACTIVE.FALSE, IS_ACTIVE.TRUE],
      default: IS_ACTIVE.TRUE,
    },
  },
  { timestamps: true }
);

tableSchema.index({ name: 1, zoneId: 1 }, { unique: true });

module.exports = mongoose.model('Table', tableSchema);
