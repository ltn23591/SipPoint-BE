// Lưu ý quan trọng cho Frontend (FE):
// Khi gọi API, FE bắt buộc phải truyền lên Backend các giá trị SỐ (Number) tương ứng dưới đây.
// Ví dụ: Truyền role = 1 (thay vì "admin"), status = 2 (thay vì "banned").
const ROLE = {
    ADMIN: "admin", // Quản trị viên
    CASHIER: "cashier", // Thu ngân
    BARISTA: "barista", // Pha chế
    WAITER: "staff", // Phục vụ / Nhân viên
};

const USER_STATUS = {
    PENDING: "pending", // Chờ xác nhận
    ACTIVE: "active",  // Hoạt động
    BANNED: "banned",  // Bị cấm
};

const OTP_TYPE = {
    REGISTER: "register",
    TWO_FACTOR: "two_factor",
    RESET_PASSWORD: "reset_password",
};

const IS_ACTIVE = {
    FALSE: "inactive",
    TRUE: "active",
};

const DISCOUNT_TYPE = {
    PERCENTAGE: "PERCENT", // Giảm theo %
    FIXED: "FIXED",      // Giảm theo số tiền cố định
};

const VARIANT_TYPE = {
    SIZE: "size",
};

const TABLE_STATUS = {
    AVAILABLE: "available", // Bàn trống
    OCCUPIED: "occupied",  // Đang có khách
    RESERVED: "reserved",  // Đã đặt trước
    CLEANING: "cleaning",  // Đang dọn dẹp
};

const ORDER_STATUS = {
    PENDING: "PENDING",
    CONFIRMED: "CONFIRMED",
    PREPARING: "PREPARING",
    READY: "READY",
    COMPLETED: "COMPLETED",
    CANCELLED: "CANCELLED",
    REFUNDED: "REFUNDED", // Đơn đã hoàn thành nhưng bị hoàn trả (trừ lại điểm tích lũy)
};

const POINT_TRANSACTION_TYPE = {
    ORDER: "ORDER",             // Tích điểm từ đơn hàng hoàn thành
    REWARD: "REWARD",           // Đổi điểm lấy quà / voucher
    BIRTHDAY_GIFT: "BIRTHDAY_GIFT",
    ADJUSTMENT: "ADJUSTMENT",   // Admin điều chỉnh thủ công
    REFUND: "REFUND",           // Trừ điểm do hoàn trả đơn hàng
    LUCKY_SPIN: "LUCKY_SPIN",   // Tiêu điểm để quay vòng quay may mắn
};

// Quy đổi điểm tích lũy: 1 điểm cho mỗi POINTS_RATE VND trên tổng hóa đơn
const POINTS_RATE = 1000;

// Chu kỳ duy trì hạng thành viên (tháng) - cơ chế reset cuốn chiếu
const TIER_CYCLE_MONTHS = 12;

// Nguồn phát voucher vào ví khách hàng
const CUSTOMER_VOUCHER_SOURCE = {
    POINTS_REDEEM: "POINTS_REDEEM", // Khách đổi điểm lấy voucher
    CAMPAIGN: "CAMPAIGN",           // Campaign phát tự động
    ADMIN: "ADMIN",                 // Admin phát thủ công
};

const CAMPAIGN_STATUS = {
    DRAFT: "DRAFT",
    ACTIVE: "ACTIVE",
    FINISHED: "FINISHED",
    CANCELLED: "CANCELLED",
};

const ORDER_TYPE = {
    DINE_IN: "dine_in",
    TAKEAWAY: "takeaway",
    DELIVERY: "delivery",
    COUNTER: "counter",
};

const PAYMENT_METHOD = {
    CASH: "CASH",
    TRANSFER: "TRANSFER",
    CARD: "CARD",
};

const SHIFT_STATUS = {
    OPEN: "OPEN",
    CLOSED: "CLOSED",
};

module.exports = {
    ROLE,
    USER_STATUS,
    OTP_TYPE,
    IS_ACTIVE,
    DISCOUNT_TYPE,
    VARIANT_TYPE,
    TABLE_STATUS,
    ORDER_STATUS,
    POINT_TRANSACTION_TYPE,
    POINTS_RATE,
    TIER_CYCLE_MONTHS,
    CUSTOMER_VOUCHER_SOURCE,
    CAMPAIGN_STATUS,
    ORDER_TYPE,
    PAYMENT_METHOD,
    SHIFT_STATUS
};
