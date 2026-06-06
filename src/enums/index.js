// Lưu ý quan trọng cho Frontend (FE):
// Khi gọi API, FE bắt buộc phải truyền lên Backend các giá trị SỐ (Number) tương ứng dưới đây.
// Ví dụ: Truyền role = 1 (thay vì "admin"), status = 2 (thay vì "banned").
const ROLE = {
    USER: 0, // Người dùng
    ADMIN: 1, // Quản trị viên
    CASHIER: 2, // Thu ngân
    BARISTA: 3, // Pha chế
    WAITER: 4, // Phục vụ
};

const USER_STATUS = {
    PENDING: 0, // Chờ xác nhận
    ACTIVE: 1,  // Hoạt động
    BANNED: 2,  // Bị cấm
};

const OTP_TYPE = {
    REGISTER: 0,
    TWO_FACTOR: 1,
    RESET_PASSWORD: 2,
}
const IS_ACTIVE = {
    FALSE: 0,
    TRUE: 1,
};

const DISCOUNT_TYPE = {
    PERCENTAGE: 0, // Giảm theo %
    FIXED: 1,      // Giảm theo số tiền cố định
};

const VARIANT_TYPE = {
    SIZE: 0,
    TOPPING: 1,
};

const TABLE_STATUS = {
    AVAILABLE: 0, // Bàn trống
    OCCUPIED: 1,  // Đang có khách
    RESERVED: 2,  // Đã đặt trước
};

module.exports = {
    ROLE,
    USER_STATUS,
    OTP_TYPE,
    IS_ACTIVE,
    DISCOUNT_TYPE,
    VARIANT_TYPE,
    TABLE_STATUS
};
