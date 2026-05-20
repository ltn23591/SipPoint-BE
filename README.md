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
- **Bảo mật 2 lớp (2FA/OTP):** Tích hợp xác thực 2 bước (gửi mã OTP qua email) giúp tăng cường bảo mật cho quá trình đăng nhập.
- **API Documentation:** Tích hợp sẵn giao diện Swagger UI tuyệt đẹp tại `/api-docs`.

## 📁 Cấu trúc thư mục

```
/
├── locales/          # File từ điển đa ngôn ngữ (en.json, vi.json)
├── logs/             # Nơi lưu trữ file log của winston
├── mails/            # Chứa các template email bằng HTML/EJS (welcome.ejs, otp.ejs)
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

## ⚡ Code Generator

Tự động sinh **model + service + controller + route** và đăng ký vào `src/api/index.js` chỉ với 1 lệnh.

**Cú pháp:**
```bash
# Dùng npm script
npm run generate <tên-resource>

# Hoặc trực tiếp
node scripts/generate.js <tên-resource>
```

**Ví dụ — tạo resource `product`:**
```bash
npm run generate product
```

Kết quả sinh ra:
```
Created: src/models/product.model.js
Created: src/services/product.service.js
Created: src/controllers/product.controller.js
Created: src/api/routes/product.route.js
Updated: src/api/index.js
```

Các endpoint được tạo sẵn:
```
GET    /api/v1/products/search        Lấy danh sách
POST   /api/v1/products/create        Tạo mới
GET    /api/v1/products/:id/detail    Lấy chi tiết
PUT    /api/v1/products/:id/update    Cập nhật
DELETE /api/v1/products/:id/delete    Xóa
```

> Sau khi generate, chỉ cần chỉnh schema trong `src/models/product.model.js` cho đúng với dữ liệu thực tế. Logic CRUD chạy được ngay mà không cần sửa thêm.

---

## 📖 API Documentation (Swagger)
Sau khi server chạy, truy cập đường dẫn sau trên trình duyệt để xem và tương tác trực tiếp với API:

👉 **[http://localhost:5000/api-docs](http://localhost:5000/api-docs)**

---

## 📝 Quy tắc Commit Message

Định dạng:
```
SP-[ID] - [Nội dung]
SP-[DATE] - [Nội dung]
```

**Theo ID task/ticket:**
```bash
git commit -m "SP-101 - Thêm API đăng nhập"
git commit -m "SP-204 - Fix lỗi upload ảnh lên Cloudinary"
git commit -m "SP-312 - Cập nhật schema Product"
```

**Theo ngày (YYYYMMDD):**
```bash
git commit -m "SP-20260521 - Khởi tạo dự án"
git commit -m "SP-20260521 - Thêm code generator"
git commit -m "SP-20260522 - Tích hợp Cloudinary"
```

---
*Phát triển bởi SipPoint Team.*
