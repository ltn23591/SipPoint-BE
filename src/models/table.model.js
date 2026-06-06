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
    status: {
      type: Number,
      enum: [TABLE_STATUS.AVAILABLE, TABLE_STATUS.OCCUPIED, TABLE_STATUS.RESERVED],
      default: TABLE_STATUS.AVAILABLE,
    },
    qrCode: {
      type: String,
    },
    isActive: {
      type: Number,
      enum: [IS_ACTIVE.FALSE, IS_ACTIVE.TRUE],
      default: IS_ACTIVE.TRUE,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Table', tableSchema);
