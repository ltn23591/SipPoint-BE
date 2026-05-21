# Node.js Express Base API (MERN Backend)

Dự án này là một Boilerplate Backend mạnh mẽ dựa trên Express.js, cung cấp sẵn các tính năng cấp doanh nghiệp (enterprise-level) cần thiết cho bất kỳ dự án nào.

## 🚀 Tính năng nổi bật
- **Bảo mật & Xác thực (Auth):** Tích hợp JWT, lưu trữ an toàn bằng HttpOnly Cookies. Hỗ trợ luồng xác thực tài khoản đăng ký mới qua Email OTP.
- **Mã hóa:** Mã hóa mật khẩu an toàn với `bcrypt`.
- **Validation:** Ràng buộc và xác thực dữ liệu đầu vào với `express-validator`.
- **Logging:** Hệ thống ghi log chuyên nghiệp ra file với `winston` (thư mục `logs/`).
- **Gửi Email:** Hỗ trợ gửi email HTML sử dụng `nodemailer` và template engine `ejs`.
- **Upload File:** Hỗ trợ API upload hình ảnh cục bộ và trực tiếp lên Cloudinary (sử dụng `multer` và `cloudinary`).
- **Đa ngôn ngữ (i18n):** Hỗ trợ trả về ngôn ngữ động dựa trên header `Accept-Language` (vi/en).
- **Kiến trúc Chuẩn (Pattern):** Áp dụng triệt để mô hình Controller-Service. Controller chỉ nhận/trả Request/Response, Service xử lý toàn bộ nghiệp vụ (Business Logic), giúp code dễ bảo trì và mở rộng.
- **Quản lý linh hoạt:** Toàn bộ thông báo (Messages), Error Codes được tách riêng vào thư mục `constants/` giúp dễ dàng bảo trì và hỗ trợ i18n tốt hơn.
- **Tiện ích:** 
  - Tự động dọn dẹp mã thừa và fix lỗi với ESLint (Auto Fix on Save) theo chuẩn Node.js.
  - Xuất danh sách dữ liệu ra file Excel với `exceljs`.
  - Tạo mã QR Code tự động với `qrcode`.
- **Bảo mật 2 lớp (2FA/OTP):** Tích hợp xác thực 2 bước (gửi mã OTP qua email) giúp tăng cường bảo mật cho quá trình đăng nhập.
- **API Documentation:** Tích hợp sẵn giao diện Swagger UI tuyệt đẹp tại `/api-docs`. Tài liệu (Swagger Specs) được quản lý tập trung bằng file YAML (trong thư mục `src/docs/`), giúp mã nguồn (Routes/Models) luôn sạch sẽ.

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
│   ├── constants/    # Quản lý hằng số tập trung (Messages, Error Codes...)
│   ├── controllers/  # Tiếp nhận Request, gọi Service và trả Response
│   ├── db/           # Kết nối MongoDB
│   ├── docs/         # Chứa tài liệu API (Swagger YAML)
│   ├── enums/        # Định nghĩa các hằng số chung (Role, Status,...)
│   ├── middleware/   # Middleware (Auth, Upload, Validation, Error Handling)
│   ├── models/       # Mongoose Schemas
│   ├── services/     # Chứa logic nghiệp vụ tương tác với Database (Business Logic)
│   ├── utils/        # Các hàm tiện ích (Gửi email, Xuất Excel, Mã QR, Response helpers...)
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
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
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
Updated: src/docs/swagger.yaml (+paths, +tags, +schemas)
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

## 🌿 Quy tắc Đặt tên Nhánh (Branch Naming)

Định dạng chung:
```
<tên-thành-viên>/<loại-công-việc>/<ID-task-hoặc-tên-tính-năng>
```

**Các loại công việc (Type) thường dùng:**
- `feat`: Phát triển tính năng mới.
- `fix`: Sửa lỗi (bug).
- `refactor`: Tái cấu trúc, dọn dẹp code (không đổi logic).

**Ví dụ:**
```bash
# Đặt tên theo tên tính năng:
git checkout -b quochung/feat/add-field
git checkout -b quochung/fix/update-field
git checkout -b quochung/refactor/update-field

# Đặt tên theo ID của task/ticket:
git checkout -b quochung/feat/SP-123
git checkout -b quochung/fix/SP-123
```

---

## 📝 Quy tắc Commit Message

Định dạng:
```
<type>: [Nội dung]
```

**Các loại commit (Type):**
- `feat`: Tính năng mới
- `fix`: Sửa lỗi
- `refactor`: Tái cấu trúc code

**Ví dụ:**
```bash
git commit -m "feat: Thêm API đăng nhập"
git commit -m "fix: Cập nhật field bị lỗi"
git commit -m "refactor: Tối ưu logic phân quyền"
git commit -m "feat: Khởi tạo dự án và cấu hình base"
```

---
*Phát triển bởi SipPoint Team.*
