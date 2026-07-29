# SipPoint-BE (Backend API)

SipPoint-BE là hệ thống Backend chuyên nghiệp, mạnh mẽ được xây dựng bằng **Node.js, Express.js và MongoDB** phục vụ cho hệ thống quản lý chuỗi quán cà phê / F&B **SipPoint**. Hệ thống cung cấp toàn bộ API RESTful cho các nền tảng: Web Admin / POS Thu ngân, App Màn hình pha chế (KDS), Landing Page Đặt hàng và Trợ lý AI Chatbot.

---

## 🚀 Các Modules & Tính năng Nổi bật

### 1. ☕ Quản lý Sản phẩm & POS Đặt hàng (Catalog & Order Management)
- **Sản phẩm & Biến thể**: Quản lý **Product**, **Category**, hỗ trợ biến thể Size M/L, Topping đi kèm và bảng giá linh hoạt (**ProductPrice**).
- **Sơ đồ Bàn ăn & Khu vực**: Quản lý **Zone** (Tầng 1, Sân thượng...) và **Table** với trạng thái real-time (`AVAILABLE`, `OCCUPIED`, `CLEANING`).
- **Xử lý Đơn hàng (POS)**: Hỗ trợ ăn tại chỗ (`DINE_IN`), mang về (`TAKE_AWAY`) và giao hàng (`DELIVERY`).
- **Real-time Socket.io**: Cập nhật tức thì trạng thái đơn hàng tới màn hình Bếp/Pha chế (KDS) và Thu ngân.

### 2. 💳 Thanh toán & Tự động Đối soát (SePay Webhook Integration)
- **Thanh toán Tiền mặt & QR Code**: Sinh mã QR động chuẩn VietQR chứa mã đơn hàng.
- **Tự động Đối soát Webhook**: Tích hợp cổng **SePay Webhook** tự động bắt giao dịch ngân hàng real-time, đối soát mã đơn và số tiền, cập nhật trạng thái `PAID` và bắn thông báo Socket.io tự động mà không cần thủ công.

### 3. 🎯 CRM, Tích điểm & Gamification (Loyalty & Marketing)
- **Khách hàng & Hạng hội viên**: Tích điểm thưởng (SipPoints) sau mỗi đơn hàng `PAID`, tự động nâng/hạ hạng thẻ (**MembershipTier**: Đồng, Bạc, Vàng, Kim Cương).
- **Phân khúc Khách hàng (Customer Segment)**: Tự động gom nhóm khách hàng theo tần suất mua và chi tiêu.
- **Vòng quay May mắn (LuckyWheel)**: Game quay thưởng tương tác với thuật toán quay thưởng ngẫu nhiên theo tỷ lệ %, tự động trao quà/voucher vào ví cá nhân của khách.
- **Khuyến mãi & Mã giảm giá**: Quản lý **Voucher**, **PromotionProgram** và **Campaign** Marketing theo phân khúc.

### 4. 🤖 Trợ lý AI & Truy vấn Kiến thức RAG (AI & Chatbot Service)
- **Hỏi đáp thông minh RAG**: Tích hợp **Google Gemini 2.5 Flash AI** kết hợp cơ chế RAG (Retrieval-Augmented Generation) từ tài liệu hệ thống (**Document**).
- **Cơ chế Fallback đa tầng**: Tự động chuyển đổi mượt mà giữa **Gemini Khóa chính -> Gemini Khóa dự phòng -> OpenAI GPT-4o-mini** nếu hết quota token.

### 5. ⚙️ Tác vụ Chạy ngầm & Báo cáo (Cron Jobs & Analytics)
- **Daily Cron Jobs (00:00 AM VN)**: Kiểm tra hết hạn hạng thẻ, đồng bộ phân khúc khách hàng, tự động đóng các campaign hết hạn.
- **Báo cáo & Ca làm việc**: Quản lý chốt két ca làm việc (**Shift**), xuất báo cáo doanh thu ra file Excel / PDF (**Export**).

---

## 🛠 Nền tảng Kỹ thuật & Bảo mật (Technical Stack & Security)

- **Core**: Node.js, Express.js, MongoDB (Mongoose Schema).
- **Real-time & Background**: Socket.io Server, Node-Cron Scheduler.
- **Bảo mật & Tối ưu**:
  - **NoSQL Injection & XSS Protection**: Tự động lọc sạch ký tự đặc biệt MongoDB (`$`, `.`) và triệt tiêu mã độc HTML/Script từ dữ liệu đầu vào.
  - **Payload Limit & Malformed Rejection**: Giới hạn kích thước payload JSON, từ chối các request sai định dạng syntax mà không làm crash app.
  - **Rate Limiting (Redis)**: Sử dụng `ioredis` và `rate-limit-redis` chống DDoS/spam API theo cấp độ.
  - **Authentication**: JWT Access/Refresh token, Google OAuth2 via Passport.js, RBAC phân quyền chặt chẽ.
  - **Security Headers**: Helmets & HTTP Headers (`nosniff`, `DENY`, `XSS Protection`, `HSTS`).
- **Logging**: Winston logger lưu log cấu trúc theo cấp độ.

---

## 📁 Cấu trúc Thư mục Dự án

```
src/
├── api/          # Khai báo các Routes chính (index.js, routes/*.route.js)
├── config/       # Cấu hình Swagger, Logger, Passport, Cloudinary, i18n
├── controllers/  # Tiếp nhận Request, validate và gọi tầng Service
├── db/           # Kết nối cơ sở dữ liệu MongoDB
├── enums/        # Các ENUM dùng chung toàn hệ thống (Role, OrderStatus...)
├── middleware/   # Middlewares (Auth JWT, Rate Limit, Security, Error Handler, Upload)
├── models/       # Định nghĩa Mongoose Schemas
├── services/     # Tầng xử lý logic nghiệp vụ cốt lõi (Business Logic Layer)
├── utils/        # Utility helpers (Format, Excel, Email, QR Code...)
├── app.js        # Khởi tạo Express App & cấu hình middlewares
└── server.js     # Entry point chính của Server
```

---

## 💻 Hướng dẫn Cài đặt & Khởi chạy

### 1. Cài đặt Dependencies
```bash
npm install
```

### 2. Cấu hình Biến môi trường (`.env`)
Tạo file `.env` từ mẫu `.env.example`:
```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/sippoint
NODE_ENV=development
JWT_SECRET=your_jwt_secret_key
ACTIVATION_SECRET=your_activation_secret
SESSION_SECRET=your_session_secret

# AI & OpenAI
GEMINI_API_KEY=your_gemini_api_key
GEMINI_API_KEY_BACKUP=your_gemini_api_key_backup
OPENAI_API_KEY=your_openai_api_key

# SePay Payment & Redis
SEPAY_ENV=sandbox
SEPAY_MERCHANT_ID=your_sepay_merchant_id
SEPAY_SECRET_KEY=your_sepay_secret_key
REDIS_URL=redis://localhost:6379

# URLs
SERVER_URL=http://localhost:5000
FRONTEND_URL=http://localhost:5173
```

### 3. Chạy ứng dụng
```bash
# Môi trường Development (tự động restart khi thay đổi code)
npm run dev

# Môi trường Production
npm start
```

---

## 📖 Tài liệu API & Kiến trúc

- **Swagger UI Interactive Docs**: Truy cập **[http://localhost:5000/api-docs](http://localhost:5000/api-docs)** khi server đang chạy.
- **Tài liệu Chi tiết Luồng Nghiệp vụ (Word .docx)**: [SipPoint_BE_Architecture_and_Flows.docx](file:///d:/Documents/FULLSTACK_MERN/CD2/SipPoint_BE_Architecture_and_Flows.docx)
