const mongoose = require('mongoose');
const { GENDER } = require('../enums');

const customerSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    // Giới tính (Module 3 - tiêu chí lọc nhóm). Khách cũ chưa có = null.
    gender: {
      type: String,
      enum: [...Object.values(GENDER), null],
      default: null,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      required: false,
      unique: true,
      sparse: true,
      trim: true,
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true,
    },
    avatar: {
      type: String,
      default: '',
    },
    dateOfBirth: {
      type: Date,
    },
    tierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MembershipTier',
      required: false,
    },
    currentPoints: {
      type: Number,
      default: 0,
    },
    // Điểm tích trong chu kỳ hạng hiện tại (12 tháng) - dùng để xét thăng/duy trì hạng.
    // Chỉ giao dịch ORDER cộng và REFUND trừ; đổi điểm lấy quà (REWARD) không ảnh hưởng.
    cyclePoints: {
      type: Number,
      default: 0,
    },
    tierAchievedAt: {
      type: Date,
    },
    tierExpiresAt: {
      type: Date,
    },
    lastVisitAt: {
      type: Date,
    },
    totalSpent: {
      type: Number,
      default: 0,
    },
    // Số đơn đã hoàn tất (COMPLETED) - cập nhật realtime, dùng cho tiêu chí lọc nhóm.
    orderCount: {
      type: Number,
      default: 0,
    },
    // Số lần đổi điểm lấy quà/voucher - cập nhật realtime, dùng cho tiêu chí lọc nhóm.
    redeemCount: {
      type: Number,
      default: 0,
    },
    password: {
      type: String,
      select: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    resetPasswordToken: {
      type: String,
    },
    resetPasswordTokenExpire: {
      type: Date,
    },
  },
  {
    timestamps: true, // Tự động tạo trường createdAt (Ngày tham gia) và updatedAt
    collection: 'customers',
  }
);

// ==== Tự động đồng bộ nhóm khách hàng động (isRealtimeUpdate: true) ====
// Các field dưới đây là dữ liệu đầu vào của bộ tiêu chí lọc nhóm
// (xem CustomerSegmentService.buildCondition). Chỉ khi một trong số chúng thay đổi
// mới cần đồng bộ lại, tránh chạy thừa với các thay đổi không liên quan (avatar, password...).
const SEGMENT_FIELDS = new Set([
  'gender',
  'dateOfBirth',
  'email',
  'phone',
  'tierId',
  'currentPoints',
  'orderCount',
  'redeemCount',
  'isActive',
]);

// Gom nhiều thay đổi liên tiếp về một lần đồng bộ và chạy nền,
// để không làm chậm request đang xử lý (đồng bộ quét lại toàn bộ khách của mỗi nhóm).
const SEGMENT_RESYNC_DEBOUNCE_MS = 3000;
let segmentResyncTimer = null;

const scheduleSegmentResync = () => {
  if (segmentResyncTimer) return;
  segmentResyncTimer = setTimeout(() => {
    segmentResyncTimer = null;
    // require trễ: customerSegment.service require ngược lại model này
    const CustomerSegmentService = require('../services/customerSegment.service');
    Promise.resolve(CustomerSegmentService.resyncRealtimeSegments()).catch((err) =>
      console.error('[Customer] Lỗi đồng bộ nhóm realtime:', err.message)
    );
  }, SEGMENT_RESYNC_DEBOUNCE_MS);
  if (typeof segmentResyncTimer.unref === 'function') segmentResyncTimer.unref();
};

// Kiểm tra một update object (findOneAndUpdate/updateOne/...) có đụng tới field lọc nhóm không
const updateTouchesSegmentFields = (update) => {
  if (!update) return false;
  return Object.keys(update).some((key) => {
    const target = key.startsWith('$') ? Object.keys(update[key] || {}) : [key];
    return target.some((field) => SEGMENT_FIELDS.has(field.split('.')[0]));
  });
};

customerSchema.pre('save', function (next) {
  this.$locals.segmentDirty =
    this.isNew || this.modifiedPaths().some((path) => SEGMENT_FIELDS.has(path.split('.')[0]));
  next();
});

customerSchema.post('save', function () {
  if (this.$locals.segmentDirty) scheduleSegmentResync();
});

customerSchema.post('insertMany', function () {
  scheduleSegmentResync();
});

customerSchema.post(
  ['findOneAndUpdate', 'updateOne', 'updateMany', 'replaceOne'],
  { document: false, query: true },
  function () {
    if (updateTouchesSegmentFields(this.getUpdate())) scheduleSegmentResync();
  }
);

// Xóa khách thì thành viên nhóm luôn cần được cập nhật lại
customerSchema.post(
  ['findOneAndDelete', 'deleteOne', 'deleteMany'],
  { document: false, query: true },
  function () {
    scheduleSegmentResync();
  }
);

module.exports = mongoose.model('Customer', customerSchema);
