const rateLimit = require('express-rate-limit');
let RedisStore = require('rate-limit-redis');
if (RedisStore.default) {
  RedisStore = RedisStore.default;
}
const Redis = require('ioredis');
const logger = require('../config/logger');

// ============================================================
// Rate Limiter Middleware sử dụng Redis
// Phù hợp cho môi trường Multi-server (Load balancing)
// ============================================================

// Khởi tạo Redis client
// Nếu không có REDIS_URL trong .env, mặc định chạy localhost:6379
const redisClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

redisClient.on('error', (err) => {
  logger.error(`[Redis] Lỗi kết nối Redis (Rate Limit): ${err.message}`);
});

redisClient.on('connect', () => {
  logger.info('[Redis] Đã kết nối thành công tới Redis cho Rate Limit');
});

/**
 * Hàm tạo Rate Limiter dùng Redis
 */
const createRateLimiter = (options) => {
  return rateLimit({
    // Sử dụng Redis Store
    store: new RedisStore({
      sendCommand: (...args) => redisClient.call(...args),
      prefix: options.prefix || 'rate_limit:'
    }),
    windowMs: options.windowMs,
    max: options.maxRequests,
    message: {
      success: false,
      message: options.message || 'Thao tác quá nhiều. Vui lòng thử lại sau.'
    },
    // Nếu có keyGenerator custom thì dùng, không thì lấy theo req.ip
    keyGenerator: options.keyGenerator || ((req) => req.ip || 'unknown'),
    standardHeaders: true, // Trả về `RateLimit-*` headers chuẩn RFC
    legacyHeaders: false, // Bỏ `X-RateLimit-*` headers cũ
    handler: (req, res, next, opts) => {
      logger.warn(`[Rate Limit] Blocked ${req.ip} - Vượt quá ${opts.max} requests`);
      res.status(opts.statusCode).json(opts.message);
    }
  });
};

// ============================================================
// Các bộ Rate Limiter được cấu hình sẵn cho từng tình huống
// ============================================================

// Giới hạn chung cho toàn bộ API: 100 request / phút / IP
const generalLimiter = createRateLimiter({
  prefix: 'rl_general:',
  windowMs: 60 * 1000,
  maxRequests: 100,
  message: 'Quá nhiều yêu cầu từ IP này. Vui lòng thử lại sau 1 phút.'
});

// Giới hạn cho API đăng nhập: 10 lần / 15 phút / IP
const authLimiter = createRateLimiter({
  prefix: 'rl_auth:',
  windowMs: 15 * 60 * 1000,
  maxRequests: 10,
  message: 'Bạn đã thử đăng nhập quá nhiều lần. Vui lòng thử lại sau 15 phút.'
});

// Giới hạn cho API gửi OTP: 5 lần / 10 phút / IP
const otpLimiter = createRateLimiter({
  prefix: 'rl_otp:',
  windowMs: 10 * 60 * 1000,
  maxRequests: 5,
  message: 'Bạn đã yêu cầu mã OTP quá nhiều lần. Vui lòng thử lại sau 10 phút.'
});

// Giới hạn nghiêm ngặt cho API nhạy cảm (xóa, đổi mật khẩu): 10 lần / phút
const strictLimiter = createRateLimiter({
  prefix: 'rl_strict:',
  windowMs: 60 * 1000,
  maxRequests: 10,
  message: 'Thao tác quá nhanh. Vui lòng thử lại sau 1 phút.'
});

module.exports = {
  createRateLimiter,
  generalLimiter,
  authLimiter,
  otpLimiter,
  strictLimiter,
  redisClient
};
