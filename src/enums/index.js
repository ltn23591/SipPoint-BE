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
    LUCKY_WHEEL: "LUCKY_WHEEL", // Cộng/trừ điểm từ vòng quay may mắn (feature cũ - giữ cho dữ liệu lịch sử)
    LUCKY_GAME: "LUCKY_GAME",   // Cộng điểm từ Trò chơi may mắn
    LUCKY_GAME_EXCHANGE_TURN: "LUCKY_GAME_EXCHANGE_TURN", // Trừ điểm để đổi lượt chơi Trò chơi may mắn
};

// Quy đổi điểm tích lũy: 1 điểm cho mỗi POINTS_RATE VND trên tổng hóa đơn
const POINTS_RATE = 10000;

// Chu kỳ duy trì hạng thành viên (tháng) - cơ chế reset cuốn chiếu
const TIER_CYCLE_MONTHS = 12;

// Nguồn phát voucher vào ví khách hàng
const CUSTOMER_VOUCHER_SOURCE = {
    POINTS_REDEEM: "POINTS_REDEEM", // Khách đổi điểm lấy voucher
    CAMPAIGN: "CAMPAIGN",           // Campaign phát tự động
    ADMIN: "ADMIN",                 // Admin phát thủ công
    LUCKY_WHEEL: "LUCKY_WHEEL",     // Trúng voucher từ vòng quay may mắn (feature cũ - giữ cho dữ liệu lịch sử)
    LUCKY_GAME: "LUCKY_GAME",       // Trúng voucher từ Trò chơi may mắn
};

// ==== Module Trò chơi may mắn (Lucky Game) ====

// Trạng thái vòng đời của trò chơi (trục sự thật DUY NHẤT cho tính khả dụng - không dùng cờ isActive riêng)
const GAME_STATUS = {
    DRAFT: "DRAFT",         // Nháp - chỉ trạng thái này mới sửa/xóa
    PUBLISHED: "PUBLISHED", // Đã xuất bản - khóa cấu hình, cho chơi trong cửa sổ ngày/giờ
    PAUSED: "PAUSED",       // Tạm dừng - admin ngưng tạm rồi mở lại
    EXPIRED: "EXPIRED",     // Đã hết hạn - cron tự chuyển khi endDate < now
    CANCELLED: "CANCELLED", // Hủy / kết thúc sớm thủ công
};

// Pha vận hành (suy ra từ ngày, KHÔNG lưu DB - chỉ để hiển thị dashboard)
const GAME_RUNTIME_PHASE = {
    SCHEDULED: "SCHEDULED", // Đã xuất bản nhưng chưa tới startDate
    RUNNING: "RUNNING",     // Đang trong cửa sổ hoạt động
};

// Loại phần thưởng của mỗi ô
const GAME_REWARD_TYPE = {
    VOUCHER: "VOUCHER", // Mã khuyến mãi - trỏ tới 1 voucher đang active
    POINTS: "POINTS",   // Điểm thưởng
    MESSAGE: "MESSAGE", // Lời chúc / không trúng (không bắt buộc là ô mặc định)
};

// Hoạt động cấp lượt chơi (mở rộng dần)
const GAME_ACTIVITY_TYPE = {
    ORDER_COMPLETED: "ORDER_COMPLETED", // Hoàn tất 1 đơn hàng
    DAILY_CHECKIN: "DAILY_CHECKIN",     // Đăng nhập / điểm danh trong ngày
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

// Giới tính khách hàng (Module 3 - tiêu chí lọc nhóm)
const GENDER = {
    MALE: "male",
    FEMALE: "female",
    OTHER: "other",
};

const CUSTOMER_TYPE = {
    MEMBER: "member",
    GUEST: "guest",
};

// Chế độ nhóm khách hàng: tự động theo bộ lọc, hoặc chọn thủ công
const SEGMENT_MODE = {
    AUTO: "AUTO",     // Lọc động theo tiêu chí, đồng bộ qua cron
    MANUAL: "MANUAL", // Danh sách khách hàng chọn tay, không tự đồng bộ
};

// ==== Module Quản lý Nguyên liệu & Kho ====

// Trạng thái tồn kho của một nguyên liệu (hệ thống tự cập nhật)
const MATERIAL_STOCK_STATUS = {
    IN_STOCK: "in_stock",         // Còn đủ hàng
    LOW: "low",                   // Sắp hết (dưới/bằng ngưỡng cảnh báo)
    OUT_OF_STOCK: "out_of_stock", // Đã hết hàng
};

// Trạng thái còn/hết hàng của sản phẩm bán ra (tách biệt với isActive bật/tắt bán thủ công)
const PRODUCT_STOCK_STATUS = {
    IN_STOCK: "in_stock",
    OUT_OF_STOCK: "out_of_stock",
};

// Loại biến động tồn kho (ledger). GĐ1 dùng IMPORT/ADJUSTMENT;
// HOLD/RELEASE/CONSUME/RESTOCK dành cho luồng Hold/Commit/Rollback (GĐ2)
const STOCK_MOVEMENT_TYPE = {
    IMPORT: "IMPORT",         // Nhập kho
    ADJUSTMENT: "ADJUSTMENT", // Điều chỉnh thủ công (kiểm kê, hao hụt...)
    HOLD: "HOLD",             // Tạm giữ khi tạo đơn
    RELEASE: "RELEASE",       // Nhả tạm giữ khi hủy đơn
    CONSUME: "CONSUME",       // Trừ kho chính thức khi đơn hoàn tất
    RESTOCK: "RESTOCK",       // Hoàn kho khi hoàn trả đơn đã trừ
};

// Gợi ý đơn vị tính phổ biến (field unit trên model để String tự do, cho phép tùy chọn khác)
const MATERIAL_UNIT = {
    KG: "kg",
    GRAM: "g",
    LITER: "l",
    ML: "ml",
    PIECE: "pcs",
    PACK: "pack",
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
    GAME_STATUS,
    GAME_RUNTIME_PHASE,
    GAME_REWARD_TYPE,
    GAME_ACTIVITY_TYPE,
    GENDER,
    CUSTOMER_TYPE,
    SEGMENT_MODE,
    MATERIAL_STOCK_STATUS,
    PRODUCT_STOCK_STATUS,
    STOCK_MOVEMENT_TYPE,
    MATERIAL_UNIT
};
