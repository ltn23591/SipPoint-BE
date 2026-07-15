const logger = require('../config/logger');

// ============================================================
// Rate Limiter Middleware - Chống spam & tấn công DDoS
// Lưu trữ bộ đếm trong bộ nhớ RAM (In-memory).
// Phù hợp cho ứng dụng đơn server (single instance).
// ============================================================

// Kho lưu trữ bộ đếm request theo từng key (IP hoặc User ID)
const rateLimitStore = new Map();

// Tự động dọn dẹp các bản ghi đã hết hạn mỗi 60 giây
setInterval(() => {
  const now = Date.now();
  for (const [key, data] of rateLimitStore.entries()) {
    if (now > data.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 60000);

/**
 * Tạo một middleware Rate Limiter tùy chỉnh.
 * @param {Object} config - Cấu hình Rate Limiter
 * @param {number} config.windowMs - Khoảng thời gian cửa sổ tính bằng milliseconds
 * @param {number} config.maxRequests - Số request tối đa được phép trong cửa sổ thời gian
 * @param {string} [config.message] - Thông báo lỗi tùy chỉnh
 * @param {Function} [config.keyGenerator] - Hàm tạo key phân biệt nguồn request
 * @returns {Function} Express Middleware
 */
const createRateLimiter = (config) => {
  return (req, res, next) => {
    try {
      // Xác định key: dùng hàm tùy chỉnh hoặc mặc định là IP
      const key = config.keyGenerator
        ? config.keyGenerator(req)
        : `rate_limit:${req.ip || 'unknown'}`;

      const now = Date.now();
      const currentData = rateLimitStore.get(key);

      if (!currentData || now > currentData.resetTime) {
        // Lần đầu hoặc cửa sổ cũ đã hết hạn -> bắt đầu cửa sổ mới
        rateLimitStore.set(key, { count: 1, resetTime: now + config.windowMs });
      } else {
        // Tăng bộ đếm trong cửa sổ hiện tại
        currentData.count++;
        rateLimitStore.set(key, currentData);
      }

      const currentCount = rateLimitStore.get(key)?.count || 0;

      if (currentCount > config.maxRequests) {
        // Vượt quá giới hạn -> chặn request và trả lỗi 429
        const retryAfter = Math.ceil(config.windowMs / 1000);
        res.set('Retry-After', retryAfter.toString());
        res.set('X-RateLimit-Limit', config.maxRequests.toString());
        res.set('X-RateLimit-Remaining', '0');

        logger.warn(`[Rate Limit] Blocked ${key} - ${currentCount}/${config.maxRequests} requests`);

        return res.status(429).json({
          success: false,
          message: config.message || `Thao tác quá nhiều. Vui lòng thử lại sau ${retryAfter} giây.`
        });
      }

      // Chưa vượt quá -> gắn thông tin Rate Limit vào header và cho đi tiếp
      res.set('X-RateLimit-Limit', config.maxRequests.toString());
      res.set('X-RateLimit-Remaining', (config.maxRequests - currentCount).toString());

      next();
    } catch (error) {
      // Nếu bản thân Rate Limiter bị lỗi thì vẫn cho request đi qua (fail-open)
      logger.error('[Rate Limit] Internal error:', error);
      next();
    }
  };
};

// ============================================================
// Các bộ Rate Limiter được cấu hình sẵn cho từng tình huống
// ============================================================

// Giới hạn chung cho toàn bộ API: 100 request / phút / IP
const generalLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 100,
  message: 'Quá nhiều yêu cầu từ IP này. Vui lòng thử lại sau 1 phút.',
  keyGenerator: (req) => `general:${req.ip || 'unknown'}`
});

// Giới hạn cho API đăng nhập: 10 lần / 15 phút / IP
const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 10,
  message: 'Bạn đã thử đăng nhập quá nhiều lần. Vui lòng thử lại sau 15 phút.',
  keyGenerator: (req) => `auth:${req.ip || 'unknown'}`
});

// Giới hạn cho API gửi OTP: 5 lần / 10 phút / IP
const otpLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  maxRequests: 5,
  message: 'Bạn đã yêu cầu mã OTP quá nhiều lần. Vui lòng thử lại sau 10 phút.',
  keyGenerator: (req) => `otp:${req.ip || 'unknown'}`
});

// Giới hạn nghiêm ngặt cho API nhạy cảm (xóa, thay đổi mật khẩu): 10 lần / phút
const strictLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 10,
  message: 'Thao tác quá nhanh. Vui lòng thử lại sau 1 phút.',
  keyGenerator: (req) => `strict:${req.ip || 'unknown'}`
});

module.exports = {
  createRateLimiter,
  generalLimiter,
  authLimiter,
  otpLimiter,
  strictLimiter
};
