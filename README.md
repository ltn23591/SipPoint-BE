# ☕ SipPoint - Backend API Service

[![Node.js](https://img.shields.io/badge/Node.js-v18+-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-v4-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Redis](https://img.shields.io/badge/Redis-Rate%20Limit-DC382D?style=for-the-badge&logo=redis&logoColor=white)](https://redis.io/)
[![Socket.io](https://img.shields.io/badge/Socket.io-Realtime-010101?style=for-the-badge&logo=socketdotio&logoColor=white)](https://socket.io/)
[![Google Gemini](https://img.shields.io/badge/Google%20Gemini-2.5%20Flash-4285F4?style=for-the-badge&logo=google-gemini&logoColor=white)](https://ai.google.dev/)
[![Swagger](https://img.shields.io/badge/Swagger-API%20Docs-85EA2D?style=for-the-badge&logo=swagger&logoColor=black)](http://localhost:5000/api-docs)

**SipPoint-BE** là hệ thống Backend API cốt lõi được xây dựng bằng **Node.js, Express.js và MongoDB**, đóng vai trò làm trung tâm xử lý dữ liệu và logic nghiệp vụ cho toàn bộ hệ sinh thái chuỗi quán cà phê & trà sữa thông minh **SipPoint Coffee & Tea**.

---

## 🌐 Tổng quan Hệ sinh thái SipPoint

Hệ sinh thái **SipPoint** bao gồm 3 dự án độc lập nhưng kết nối chặt chẽ với nhau:

```
                      ┌─────────────────────────────────────────┐
                      │    SipPoint-Landing-Page (Customer)    │
                      │    - Đặt món Chuyển khoản / Tiền mặt    │
                      │    - Tích điểm, Ví Voucher, Game       │
                      │    - Trợ lý AI tư vấn & Theo dõi đơn   │
                      └────────────────────┬────────────────────┘
                                           │
                                           │ REST API / WebSockets
                                           ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                SipPoint-BE (Backend API)                               │
│  - Express.js RESTful API & WebSocket Realtime Server (Socket.io)                       │
│  - Database: MongoDB (Mongoose Schemas) & Redis (Rate Limiting)                        │
│  - Payment Gateway: SePay Webhook Auto-Reconciliation                                  │
│  - AI Core: Google Gemini 2.5 Flash RAG Chatbot Engine (+ OpenAI Fallback)             │
│  - Background Services: Node-Cron Scheduler (Cron Jobs 00:00 AM VN)                     │
└──────────────────────────────────────────┬─────────────────────────────────────────────┘
                                           ▲
                                           │ REST API / WebSockets
                                           │
                      ┌────────────────────┴────────────────────┐
                      │    SipPoint-Portal (Admin & POS)       │
                      │    - Màn hình POS & Kanban Đơn hàng     │
                      │    - In Hóa đơn nhiệt 80mm & Sơ đồ Bàn  │
                      │    - Quản lý CRM, Kho & Báo cáo Excel   │
                      └─────────────────────────────────────────┘
```

---

## 🚀 Các Modules & Tính năng Nổi bật

### 1. ☕ Quản lý Thực đơn, Khu vực & Đặt hàng (Catalog & Order Management)
- **Thực đơn & Biến thể**: Quản lý **Product**, **Category**, hỗ trợ chọn Size (M/L), Topping đi kèm và linh hoạt thiết lập bảng giá (**ProductPrice**).
- **Sơ đồ Bàn ăn & Khu vực**: Quản lý **Zone** (Tầng 1, Sân thượng...) và **Table** với cập nhật trạng thái thời gian thực (`AVAILABLE`, `OCCUPIED`, `CLEANING`).
- **Xử lý Đơn hàng (POS)**: Hỗ trợ đa dạng hình thức: Ăn tại chỗ (`DINE_IN`), Mang về (`TAKE_AWAY`) và Giao hàng (`DELIVERY`).
- **Real-time WebSockets**: Cập nhật ngay lập tức trạng thái đơn hàng tới màn hình Bếp / Pha chế (KDS) và Portal Quản trị qua Socket.io.

### 2. 💳 Thanh toán & Tự động Đối soát (SePay Webhook Integration)
- **Thanh toán Tiền mặt & Chuyển khoản (SePay)**: Hỗ trợ thanh toán tiền mặt và chuyển khoản ngân hàng qua cổng SePay Gateway.
- **Tự động Đối soát Webhook**: Tích hợp cổng **SePay Webhook** lắng nghe biến động tài khoản ngân hàng real-time, tự động khớp mã đơn và số tiền, cập nhật trạng thái đơn thành `PAID` và phát thông báo WebSocket không cần thao tác thủ công.

### 3. 🎯 CRM, Tích điểm & Gamification (Loyalty & Marketing)
- **Hạng thẻ Hội viên (Membership Tier)**: Tự động cộng điểm thưởng (SipPoints) cho đơn hàng hoàn tất, tự động tính toán nâng/hạ hạng thẻ (**MembershipTier**: Đồng, Bạc, Vàng, Kim Cương).
- **Phân khúc Khách hàng (Customer Segmentation)**: Gom nhóm khách hàng tự động dựa theo tần suất mua và tổng chi tiêu.
- **Vòng quay May mắn (LuckyWheel)**: Game tương tác tích hợp thuật toán phân bổ quà thưởng theo tỷ lệ phần trăm (%), tự động gửi Voucher vào ví cá nhân của khách hàng.
- **Khuyến mãi & Mã giảm giá**: Quản lý **Voucher**, **PromotionProgram** và chiến dịch **Campaign** Marketing hướng đối tượng.

### 4. 🤖 Trợ lý AI & Truy vấn RAG (AI & Chatbot Service)
- **Truy vấn RAG Kiến thức**: Tích hợp **Google Gemini 2.5 Flash** kết hợp cơ chế RAG (Retrieval-Augmented Generation) tra cứu trực tiếp từ dữ liệu hệ thống (**Document**).
- **Cơ chế Fallback Đa tầng**: Tự động chuyển đổi thông minh: **Gemini Khóa chính ➔ Gemini Khóa dự phòng ➔ OpenAI GPT-4o-mini** khi vượt hạn ngạch token.

### 5. ⚙️ Tác vụ Chạy ngầm & Báo cáo (Cron Jobs & Analytics)
- **Daily Cron Jobs (00:00 AM VN)**: Kiểm tra hết hạn hạng thẻ hội viên, đồng bộ phân khúc khách hàng, tự động đóng các chương trình khuyến mãi hết hạn.
- **Báo cáo & Quản lý Ca làm**: Quản lý chốt két ca làm việc (**Shift**), xuất báo cáo doanh thu ra file Excel (`.xlsx`) và PDF (`.pdf`).

---

## 🛡️ Nền tảng Kỹ thuật & Bảo mật

- **Core Framework**: Node.js, Express.js (ES Modules).
- **Database**: MongoDB với Mongoose ORM, kiểm soát chỉ mục và schema validation chặt chẽ.
- **Bảo mật & Tối ưu hóa**:
  - **NoSQL Injection & XSS Protection**: Tự động làm sạch ký tự đặc biệt MongoDB (`$`, `.`) và loại bỏ hoàn toàn mã độc Script trong payload đầu vào.
  - **Payload Limit & Malformed Rejection**: Giới hạn dung lượng JSON body, xử lý gracefully lỗi syntax mà không làm gián đoạn Server.
  - **Rate Limiting**: Sử dụng `ioredis` và `rate-limit-redis` chống tấn công DDoS / Spam API theo IP và Endpoint.
  - **Authentication & RBAC**: JWT Access & Refresh Token, Google OAuth2 (Passport.js), phân quyền theo Role (**ADMIN**, **MANAGER**, **STAFF**, **CUSTOMER**).
  - **Security Headers**: Helmets HTTP Headers (`nosniff`, `DENY`, `XSS Protection`, `HSTS`).
- **Logging System**: Winston Logger ghi log có cấu trúc chi tiết theo từng môi trường.

---

## 📁 Cấu trúc Thư mục Dự án

```
CD2/ (SipPoint-BE)
├── src/
│   ├── api/          # Khai báo các Routes chính (index.js, routes/*.route.js)
│   ├── config/       # Cấu hình Swagger, Logger, Passport, Cloudinary, i18n
│   ├── controllers/  # Tiếp nhận Request, validate dữ liệu và chuyển Service
│   ├── db/           # Kết nối CSDL MongoDB (connectDB.js)
│   ├── enums/        # Định nghĩa ENUM dùng chung (Role, OrderStatus, Tier...)
│   ├── middleware/   # Middlewares (Auth JWT, Rate Limit, Security, Error Handler, Upload)
│   ├── models/       # Định nghĩa Mongoose Schemas & Models
│   ├── services/     # Tầng xử lý logic nghiệp vụ cốt lõi (Business Logic)
│   ├── utils/        # Utility helpers (Format, Excel, Email, QR Code, Gemini AI...)
│   ├── app.js        # Khởi tạo Express App & cấu hình middlewares
│   └── server.js     # Entry point khởi chạy HTTP & WebSocket Server
├── .env.example      # Mẫu biến môi trường
├── package.json      # Dependencies & Scripts
└── README.md         # Tài liệu dự án
```

---

## 💻 Hướng dẫn Cài đặt & Khởi chạy Local

### 1. Yêu cầu hệ thống
- **Node.js**: `>= v18.0.0`
- **MongoDB**: Đã cài đặt MongoDB Local hoặc MongoDB Atlas URI.
- **Redis** *(Tùy chọn cho Rate Limiting)*: Redis Server running at `localhost:6379`.

### 2. Cài đặt Dependencies
```bash
npm install
```

### 3. Cấu hình Biến môi trường (`.env`)
Tạo file `.env` tại thư mục gốc từ mẫu `.env.example`:

```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/sippoint

# Authentication
JWT_SECRET=your_jwt_secret_key
ACTIVATION_SECRET=your_activation_secret
SESSION_SECRET=your_session_secret

# AI Core Keys
GEMINI_API_KEY=your_gemini_api_key
GEMINI_API_KEY_BACKUP=your_gemini_api_key_backup
OPENAI_API_KEY=your_openai_api_key

# SePay Payment Gateway
SEPAY_ENV=sandbox
SEPAY_MERCHANT_ID=your_sepay_merchant_id
SEPAY_SECRET_KEY=your_sepay_secret_key
REDIS_URL=redis://localhost:6379

# Domain URLs
SERVER_URL=http://localhost:5000
FRONTEND_URL=http://localhost:5173
```

### 4. Chạy ứng dụng
```bash
# Môi trường Development (tự động reload code với nodemon)
npm run dev

# Môi trường Production
npm start
```

---

## 🚀 Triển khai Production (Render / VPS)

- **Platform khuyến nghị**: [Render.com](https://render.com/) hoặc VPS Linux (Ubuntu/Debian) với PM2.
- **Build Command**: `npm install`
- **Start Command**: `npm start`
- **Health Check Path**: `/api/v1/health` hoặc Swagger UI tại `/api-docs`.

---

## 📖 Tài liệu API & Kiến trúc

- **Swagger UI Interactive Docs**: Truy cập **[http://localhost:5000/api-docs](http://localhost:5000/api-docs)** khi server đang chạy.
- **Tài liệu Chi tiết Luồng Nghiệp vụ (Word .docx)**: [SipPoint_BE_Architecture_and_Flows.docx](file:///d:/Documents/FULLSTACK_MERN/CD2/SipPoint_BE_Architecture_and_Flows.docx)

