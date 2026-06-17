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
    TOPPING: "topping",
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
};

const ORDER_TYPE = {
    DINE_IN: "dine_in",
    TAKEAWAY: "takeaway",
    DELIVERY: "delivery",
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
    ORDER_TYPE
};
