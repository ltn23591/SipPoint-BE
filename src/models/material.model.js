const mongoose = require('mongoose');
const { MATERIAL_STOCK_STATUS } = require('../enums');

const materialSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },
    // Mã nguyên liệu / SKU (tùy chọn, không trùng nếu có)
    code: {
      type: String,
      trim: true,
      uppercase: true,
      sparse: true,
      unique: true,
    },
    // Đơn vị tính riêng cho mỗi nguyên liệu: kg, g, l, ml, chai, gói...
    unit: {
      type: String,
      required: true,
      trim: true,
    },
    // Tồn kho thực tế
    onHand: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Số lượng đang tạm giữ cho các đơn chưa hoàn tất (dùng ở Giai đoạn 2)
    reserved: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Ngưỡng cảnh báo sắp hết / điểm đặt lại hàng
    minThreshold: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Giá vốn trên một đơn vị (phục vụ báo cáo giá trị tồn & tiêu hao)
    cost: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Trạng thái tồn kho do hệ thống tự cập nhật
    status: {
      type: String,
      enum: Object.values(MATERIAL_STOCK_STATUS),
      default: MATERIAL_STOCK_STATUS.IN_STOCK,
    },
    isActive: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
    isDeleted: {
      type: Boolean,
      default: false,
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: false,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: false,
    },
  },
  {
    timestamps: true,
    collection: 'materials',
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Số lượng còn khả dụng để đặt = tồn thực tế - đang tạm giữ
materialSchema.virtual('available').get(function () {
  return Math.max(0, (this.onHand || 0) - (this.reserved || 0));
});

materialSchema.index({ name: 'text' });
materialSchema.index({ status: 1 });
materialSchema.index({ isDeleted: 1 });

module.exports = mongoose.model('Material', materialSchema);
