# Node.js Express Base API (MERN Backend)

Dự án này là một Boilerplate Backend mạnh mẽ dựa trên Express.js, cung cấp sẵn các tính năng cấp doanh nghiệp (enterprise-level) cần thiết cho bất kỳ dự án nào.

## 🚀 Tính năng nổi bật
- **Bảo mật & Xác thực (Auth):** Tích hợp JWT, lưu trữ an toàn bằng HttpOnly Cookies.
- **Mã hóa:** Mã hóa mật khẩu an toàn với `bcrypt`.
- **Validation:** Ràng buộc và xác thực dữ liệu đầu vào với `express-validator`.
- **Logging:** Hệ thống ghi log chuyên nghiệp ra file với `winston` (thư mục `logs/`).
- **Gửi Email:** Hỗ trợ gửi email HTML sử dụng `nodemailer` và template engine `ejs`.
- **Upload File:** API upload hình ảnh cục bộ an toàn với `multer`.
- **Đa ngôn ngữ (i18n):** Hỗ trợ trả về ngôn ngữ động dựa trên header `Accept-Language` (vi/en).
- **Tiện ích:** 
  - Xuất danh sách dữ liệu ra file Excel với `exceljs`.
  - Tạo mã QR Code tự động với `qrcode`.
- **API Documentation:** Tích hợp sẵn giao diện Swagger UI tuyệt đẹp tại `/api-docs`.

## 📁 Cấu trúc thư mục

```
/
├── locales/          # File từ điển đa ngôn ngữ (en.json, vi.json)
├── logs/             # Nơi lưu trữ file log của winston
├── mails/            # Chứa các template email bằng HTML/EJS (welcome.ejs)
├── public/uploads/   # Thư mục lưu trữ hình ảnh upload cục bộ
├── src/
│   ├── api/          # Các routes API và cấu hình Router
│   ├── config/       # Cấu hình Swagger, Logger, i18n
│   ├── controllers/  # Xử lý logic Request/Response
│   ├── db/           # Kết nối MongoDB
│   ├── middleware/   # Middleware (Auth, Upload, Validation, Error Handling)
│   ├── models/       # Mongoose Schemas
│   ├── services/     # Chứa logic nghiệp vụ tương tác với Database
│   ├── utils/        # Các hàm tiện ích (Gửi email, Xuất Excel, Mã QR...)
│   ├── app.js        # Cấu hình Express App, Middlewares
│   └── server.js     # Điểm khởi chạy Server
└── .env              # Biến môi trường
```

## 🛠 Cài đặt & Chạy dự án

**1. Cài đặt các thư viện**
```bash
npm install
```

**2. Cấu hình biến môi trường (`.env`)**
Bạn cần thiết lập các biến sau trong file `.env`:
```env
PORT=5000
MONGO_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/database
NODE_ENV=development
JWT_SECRET=your_super_secret_key
SMTP_HOST=smtp.ethereal.email
SMTP_PORT=587
SMTP_USER=test@example.com
SMTP_PASS=password
```

**3. Chạy Server**
```bash
# Môi trường Development (sử dụng nodemon tự động reload)
npm run dev

# Môi trường Production
npm start
```

## 📖 API Documentation (Swagger)
Sau khi server chạy, truy cập đường dẫn sau trên trình duyệt để xem và tương tác trực tiếp với API:

👉 **[http://localhost:5000/api-docs](http://localhost:5000/api-docs)**

---
*Phát triển bởi đội ngũ Node Express Base.*
