// Lưu ý quan trọng cho Frontend (FE):
// Khi gọi API, FE bắt buộc phải truyền lên Backend các giá trị SỐ (Number) tương ứng dưới đây.
// Ví dụ: Truyền role = 1 (thay vì "admin"), status = 2 (thay vì "banned").
const ROLE = {
    USER: 0, // Người dùng
    ADMIN: 1, // Quản trị viên
};

const USER_STATUS = {
    PENDING: 0, // Chờ xác nhận
    ACTIVE: 1,  // Hoạt động
    BANNED: 2,  // Bị cấm
};

module.exports = {
    ROLE,
    USER_STATUS,
};
