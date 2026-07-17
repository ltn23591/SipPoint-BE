const AppError = require('../utils/AppError');

// ============================================================
// Security Middleware - Tăng cường bảo mật nâng cao
// ============================================================

/**
 * Chống tấn công NoSQL Injection.
 * Quét body, query, params và loại bỏ các ký tự đặc biệt MongoDB ($, .).
 * Ví dụ: { "email": { "$gt": "" } } sẽ bị chặn.
 */
const sanitizeInput = (req, res, next) => {
  const sanitize = (obj) => {
    if (typeof obj !== 'object' || obj === null) return obj;
    for (const key of Object.keys(obj)) {
      if (key.startsWith('$') || key.includes('.')) {
        delete obj[key];
      } else if (typeof obj[key] === 'object') {
        sanitize(obj[key]);
      }
    }
    return obj;
  };

  if (req.body) sanitize(req.body);
  if (req.query) sanitize(req.query);
  if (req.params) sanitize(req.params);

  next();
};

/**
 * Giới hạn kích thước payload JSON.
 * Chặn các request có body quá lớn để tránh tấn công DoS bằng cách gửi JSON khổng lồ.
 * @param {number} maxSizeKB - Kích thước tối đa tính bằng KB (mặc định: 500KB)
 */
const limitPayloadSize = (maxSizeKB = 500) => {
  return (req, res, next) => {
    const contentLength = parseInt(req.headers['content-length'] || '0', 10);
    const maxBytes = maxSizeKB * 1024;

    if (contentLength > maxBytes) {
      return next(new AppError(`Kích thước request vượt quá giới hạn cho phép (${maxSizeKB}KB).`, 413));
    }
    next();
  };
};

/**
 * Thêm các Security Headers bổ sung (ngoài Helmet).
 * - X-Content-Type-Options: Chống MIME-sniffing
 * - X-Frame-Options: Chống Clickjacking
 * - X-XSS-Protection: Chống XSS trên trình duyệt cũ
 * - Strict-Transport-Security: Bắt buộc HTTPS
 * - Permissions-Policy: Giới hạn quyền truy cập API trình duyệt
 */
const securityHeaders = (req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  next();
};

module.exports = {
  sanitizeInput,
  limitPayloadSize,
  securityHeaders
};
