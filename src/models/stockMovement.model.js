const mongoose = require('mongoose');
const { STOCK_MOVEMENT_TYPE } = require('../enums');

// Sổ cái biến động tồn kho (append-only) - nguồn dữ liệu cho báo cáo tiêu hao.
// Mẫu thiết kế theo pointHistory.model.js.
const stockMovementSchema = new mongoose.Schema(
  {
    materialId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Material',
      required: true,
    },
    type: {
      type: String,
      enum: Object.values(STOCK_MOVEMENT_TYPE),
      required: true,
    },
    // Lượng biến động: dương khi nhập/hoàn kho, âm khi tiêu hao/điều chỉnh giảm
    quantityChange: {
      type: Number,
      required: true,
    },
    // Tồn thực tế (onHand) sau khi áp dụng biến động
    balanceAfter: {
      type: Number,
      required: true,
    },
    // Liên kết đơn hàng nếu biến động phát sinh từ xử lý đơn (dùng ở Giai đoạn 2)
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: false,
    },
    note: {
      type: String,
      trim: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: false,
    },
  },
  {
    timestamps: true,
    collection: 'stock_movements',
  }
);

stockMovementSchema.index({ materialId: 1, createdAt: -1 });
stockMovementSchema.index({ type: 1 });

module.exports = mongoose.model('StockMovement', stockMovementSchema);
