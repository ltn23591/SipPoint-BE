const mongoose = require('mongoose');
const { POINT_TRANSACTION_TYPE } = require('../enums');

const pointHistorySchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: false,
    },
    title: {
      type: String,
      required: true,
      trim: true, // VD: "Đơn hàng #3920" hoặc "Thưởng sinh nhật"
    },
    description: {
      type: String,
      trim: true, // VD: "Thanh toán tại quầy"
    },
    pointsChange: {
      type: Number,
      required: true, // VD: +150, -200
    },
    transactionType: {
      type: String,
      enum: Object.values(POINT_TRANSACTION_TYPE),
      required: true,
    },
  },
  {
    timestamps: true,
    collection: 'point_histories',
  }
);

module.exports = mongoose.model('PointHistory', pointHistorySchema);
