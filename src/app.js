const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const dotenv = require('dotenv');
const compression = require('compression');
const logger = require('./config/logger');

dotenv.config();

const cookieParser = require('cookie-parser');
const path = require('path');
const apiRoutes = require('./api');
const errorHandler = require('./middleware/errorHandler');
const setupSwagger = require('./config/swagger');
const i18n = require('./config/i18n');
const { generalLimiter } = require('./middleware/rateLimit.middleware');
const { sanitizeInput, securityHeaders } = require('./middleware/security.middleware');

const app = express();

// 1. Middlewares bảo mật & Tối ưu & Logging
app.use(helmet());
app.use(cors());
app.use(securityHeaders); // Security Headers bổ sung
app.use(compression()); // Nén toàn bộ payload JSON để giảm băng thông
app.use(generalLimiter); // Giới hạn 100 request/phút/IP cho toàn bộ API

const morganFormat = process.env.NODE_ENV === 'production' ? 'combined' : 'dev';
app.use(
  morgan(morganFormat, {
    stream: {
      write: (message) => logger.info(message.trim()),
    },
  })
);

// 2. Parsers
app.use(express.json({ limit: '500kb' })); // Giới hạn kích thước JSON body
app.use(express.urlencoded({ extended: true, limit: '500kb' }));
app.use(cookieParser());
app.use(sanitizeInput); // Chống NoSQL Injection
app.use(i18n.init); // Khởi tạo i18n

// 2.5 Static Files
app.use(express.static(path.join(__dirname, '../public')));

// 3. Khởi tạo tài liệu API Swagger
setupSwagger(app);

// 4. API Routes chính
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API working',
  });
});

app.use('/api/v1', apiRoutes);

// 5. Route không tồn tại (404)
const AppError = require('./utils/AppError');
app.use((req, res, next) => {
  next(new AppError(`Không tìm thấy đường dẫn: ${req.originalUrl}`, 404));
});

// 6. Xử lý lỗi toàn cục
app.use(errorHandler);

module.exports = app;
