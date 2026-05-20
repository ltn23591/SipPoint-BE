# Node.js Express Boilerplate

Dự án này là cấu trúc cơ sở (Base/Boilerplate) cho ứng dụng Node.js & Express.js viết bằng ES Modules (`import/export`).

## Các công nghệ sử dụng
- **Express**: Framework ứng dụng web.
- **Mongoose**: Tương tác với MongoDB.
- **dotenv**: Quản lý biến môi trường.
- **cors**: Quản lý chia sẻ tài nguyên (Cross-Origin Resource Sharing).
- **helmet**: Bảo mật ứng dụng bằng cách cấu hình HTTP headers thích hợp.
- **morgan**: Ghi log HTTP requests.
- **nodemon**: Tự động reload server khi viết code.

## Cấu trúc thư mục
```text
CD2/
├── src/
│   ├── config/          # Cấu hình hệ thống (DB, environment, ...)
│   ├── controllers/     # Xử lý nghiệp vụ logic
│   ├── middleware/      # Middleware xử lý request & error handler
│   ├── models/          # Khai báo schema/model (Database)
│   ├── routes/          # Cấu hình routes API
│   ├── app.js           # Khởi tạo & cấu hình express app
│   └── server.js        # Entry point để chạy server
└── .env                 # File chứa biến môi trường cấu hình
```

## Cách cài đặt và chạy thử

### 1. Cài đặt các thư viện cần thiết
```bash
npm install
```

### 2. Thiết lập biến môi trường
Sao chép nội dung từ file `.env.example` tạo thành file `.env` nếu chưa có:
```bash
cp .env.example .env
```
Cấu hình các tham số `PORT` và `MONGO_URI` cho phù hợp với môi trường của bạn.

### 3. Chạy dự án
- Chạy ở chế độ phát triển (Auto reload):
```bash
npm run dev
```

- Chạy ở chế độ production:
```bash
npm start
```

## Các API endpoints mẫu
- Lấy danh sách users (mock): `GET http://localhost:5000/api/users`
- Tạo mới user (mock): `POST http://localhost:5000/api/users`
