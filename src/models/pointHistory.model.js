const mongoose = require('mongoose');

const pointHistorySchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
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
      enum: ['ORDER', 'REWARD', 'BIRTHDAY_GIFT', 'ADJUSTMENT'],
      required: true,
    },
  },
  {
    timestamps: true,
    collection: 'point_histories',
  }
);

module.exports = mongoose.model('PointHistory', pointHistorySchema);
