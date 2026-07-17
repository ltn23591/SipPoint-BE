# SipPoint-BE (Backend API)

SipPoint-BE là hệ thống Backend mạnh mẽ được xây dựng bằng Node.js & Express.js dành riêng cho dự án quản lý chuỗi cửa hàng F&B (SipPoint). Hệ thống cung cấp API cho cả trang quản trị (Portal) lẫn trang đặt hàng của khách (Landing Page).

## 🚀 Các Modules & Tính năng chính

Sau quá trình phát triển, dự án đã hoàn thiện các module nghiệp vụ phức tạp:

### 1. Quản lý Sản phẩm (Catalog Management)
- Quản lý **Sản phẩm (Product)**, **Danh mục (Category)**.
- Hỗ trợ **Sản phẩm nhiều biến thể (Product Variants)** (Size M, L, Topping...).
- Quản lý **Giá bán theo cấu hình (Product Price)** linh hoạt.

### 2. Quản lý Bán hàng & Vận hành (Order & Table)
- Quản lý **Khu vực (Zone)** và **Bàn ăn (Table)** với trạng thái real-time (Trống, Đang phục vụ, Đã đặt).
- Quản lý **Giỏ hàng (Cart)** và **Đơn hàng (Order/OrderItem)** hỗ trợ ăn tại chỗ và mang đi.
- **Socket.io Real-time:** Bắn sự kiện tức thì khi có đơn hàng mới (`order_created`) hoặc trạng thái đơn hàng thay đổi (`order_status_updated`) tới thu ngân và bếp.

### 3. CRM & Loyalty (Khách hàng thân thiết)
- Hồ sơ **Khách hàng (Customer)** với hệ thống **Phân khúc (Customer Segment)** tự động.
- Hệ thống **Hạng thành viên (Membership Tier/Program)** (Đồng, Bạc, Vàng...).
- Tích lũy điểm thưởng và lịch sử điểm **(Point History)**.
- Hệ thống **Mã giảm giá (Voucher / CustomerVoucher)**, **Chiến dịch Marketing (Campaign)** và **Chương trình khuyến mãi (Promotion Program)**.

### 4. Quản lý Nhân sự (HR & Store)
- Quản lý **Nhân viên (Employee)**, **Vai trò/Phân quyền (Staff Role)**.
- Quản lý **Ca làm việc (Shift)** của nhân sự.
- Cấu hình thông tin **Cửa hàng (Store)**.

### 5. Tiện ích & Giao tiếp mở rộng
- **Thanh toán tự động:** Tích hợp API cổng **SePay Checkout** tự động bắt IPN (Webhook) cập nhật trạng thái đơn hàng thành công, không cần thu ngân can thiệp. (Đã loại bỏ MoMo/VietQR tĩnh).
- **Hỗ trợ AI:** Tích hợp module **Chat Session** để hỗ trợ tư vấn tự động.
- **Thông báo & Phản hồi:** Quản lý Notification trong hệ thống và Feedback từ khách hàng.
- **Activity Log:** Lưu vết mọi thao tác của nhân viên trên hệ thống.

---

## 🛠 Nền tảng kỹ thuật (Technical Stack)

- **Framework:** Express.js (Node.js) + MongoDB (Mongoose).
- **Bảo mật & Chống tấn công:** 
  - Xác thực qua JWT (bảo vệ route bằng middleware `auth`), hash mật khẩu bằng `bcrypt`.
  - Tích hợp **Rate Limiting** sử dụng **Redis** (chống spam/DDoS chia nhiều cấp độ: API thường, Auth, OTP).
  - Tích hợp Security Middleware chống **NoSQL Injection**, giới hạn kích thước Payload, và `helmet` Security Headers.
  - Kiểm duyệt chặt chẽ dữ liệu đầu vào (Input Validation) bằng `express-validator`.
- **Tối ưu Hiệu năng:** Sử dụng middleware `compression` nén GZIP toàn bộ response và dùng `.lean()` ở mức database giúp truy vấn siêu tốc.
- **Logging & Error Handling:** Dùng `winston` lưu log ra file, cơ chế chặn lỗi tập trung bằng `errorHandler` middleware.
- **Upload File:** Hỗ trợ Cloudinary (qua `multer` & `multer-storage-cloudinary`).
- **Gửi Email:** Tích hợp `nodemailer` với template `EJS` (Dùng cho quên mật khẩu / mã OTP).

---

## 📁 Cấu trúc thư mục (Folder Structure)

```
src/
├── api/          # Khai báo các Routes chính (index.js, routes/*.route.js)
├── config/       # Cấu hình Swagger, Logger, i18n
├── constants/    # Hằng số, mã lỗi, messages...
├── controllers/  # Tiếp nhận Request và gọi tầng Service (Controller)
├── db/           # Kết nối cơ sở dữ liệu MongoDB
├── docs/         # Swagger YAML (Tài liệu API)
├── enums/        # Các ENUM chung của hệ thống (Trạng thái đơn, Role...)
├── middleware/   # Middleware (xác thực token, xử lý lỗi, validate, upload)
├── models/       # Định nghĩa Mongoose Schemas (Tất cả entities)
├── services/     # Chứa logic nghiệp vụ cốt lõi (Business Logic Layer)
├── utils/        # Hàm tiện ích hỗ trợ (Gửi mail, tạo mã QR, Format...)
├── app.js        # Khởi tạo và thiết lập các Middleware của Express
└── server.js     # Điểm khởi chạy (Entry point) của Server
```

---

## 💻 Hướng dẫn chạy dự án

**1. Cài đặt các thư viện**
```bash
npm install
```

**2. Thiết lập biến môi trường (`.env`)**
Cần có file `.env` với các cấu hình cơ bản:
```env
PORT=5000
MONGO_URI=mongodb+srv://<username>:<password>@cluster/database
JWT_SECRET=your_secret_key
ACTIVATION_SECRET=your_activation_secret

# Cấu hình Redis (Bắt buộc để chạy Rate Limiting)
# Chạy local: redis://localhost:6379, Chạy Upstash Cloud: rediss://...
REDIS_URL=rediss://default:matkhau@diachi.upstash.io:6379

# Cấu hình SePay Webhook
SEPAY_MERCHANT_ID=SP-LIVE-...
SEPAY_SECRET_KEY=spsk_live_...
# Và các biến Cloudinary, SMTP khác
```

**3. Khởi động Server**
```bash
# Môi trường Development (tự động restart khi code thay đổi)
npm run dev

# Môi trường Production
npm start
```

## 📖 API Documentation (Swagger)
Để tra cứu nhanh danh sách API và test trực tiếp, sau khi khởi chạy truy cập vào:
👉 **[http://localhost:5000/api-docs](http://localhost:5000/api-docs)**
