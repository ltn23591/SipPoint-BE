const mongoose = require('mongoose');
const { IS_ACTIVE, SEGMENT_MODE } = require('../enums');

// Một điều kiện lọc: field + operator + value (value linh hoạt: số / mảng / boolean / chuỗi)
const conditionSchema = new mongoose.Schema(
  {
    field: { type: String, required: true }, // gender | age | birthdayMonth | points | hasEmail | hasPhone | redeemCount | orderCount | tier
    operator: { type: String, required: true }, // eq | ne | gt | lt | between | in | notIn
    value: { type: mongoose.Schema.Types.Mixed },
  },
  { _id: false }
);

// Một nhóm điều kiện: các điều kiện bên trong nối bằng AND (VÀ)
const groupSchema = new mongoose.Schema(
  {
    conditions: { type: [conditionSchema], default: [] },
  },
  { _id: false }
);

const customerSegmentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true, // VD: "Khách VIP có sinh nhật tháng 7"
    },
    description: {
      type: String,
      trim: true,
    },
    // Chế độ nhóm: AUTO (lọc động) hoặc MANUAL (chọn tay)
    mode: {
      type: String,
      enum: Object.values(SEGMENT_MODE),
      default: SEGMENT_MODE.AUTO,
    },
    // Tự động cập nhật lại thành viên ngay khi dữ liệu KH thay đổi (đơn/đổi quà),
    // thay vì chỉ chờ cron 00:00. Chỉ áp dụng cho nhóm AUTO.
    isRealtimeUpdate: {
      type: Boolean,
      default: false,
    },
    // Bộ tiêu chí (chỉ dùng khi mode = AUTO):
    // các nhóm nối OR, mỗi nhóm chứa các điều kiện nối AND.
    criteria: {
      groups: { type: [groupSchema], default: [] },
    },
    // Danh sách thành viên đã materialize.
    // - AUTO: đồng bộ qua cron/sync theo criteria.
    // - MANUAL: admin chọn tay, không tự đồng bộ.
    memberIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Customer' }],
    memberCount: {
      type: Number,
      default: 0,
    },
    lastSyncedAt: {
      type: Date,
    },
    isActive: {
      type: String,
      enum: [IS_ACTIVE.FALSE, IS_ACTIVE.TRUE],
      default: IS_ACTIVE.TRUE,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
    },
  },
  {
    timestamps: true,
    collection: 'customer_segments',
  }
);

module.exports = mongoose.model('CustomerSegment', customerSegmentSchema);
