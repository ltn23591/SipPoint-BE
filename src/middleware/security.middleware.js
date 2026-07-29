// Simple, effective XSS cleaning for string input without heavy dependencies
const sanitizeString = (str) => {
  if (typeof str !== 'string') return str;
  return str
    .trim()
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove <script> tags
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '') // Remove <iframe> tags
    .replace(/javascript\s*:/gi, '') // Remove javascript: pseudo-protocols
    .replace(/on\w+\s*=/gi, ''); // Remove event handler attributes (onload=, onerror=, etc.)
};

/**
 * Chống tấn công NoSQL Injection, XSS và Tự động làm sạch dữ liệu đầu vào.
 * Quét body, query, params và loại bỏ các ký tự đặc biệt MongoDB ($, .)
 * đồng thời loại bỏ các mã độc HTML/Script (XSS).
 */
const sanitizeInput = (req, res, next) => {
  const sanitize = (obj) => {
    if (typeof obj !== 'object' || obj === null) return obj;

    if (Array.isArray(obj)) {
      for (let i = 0; i < obj.length; i++) {
        if (typeof obj[i] === 'string') {
          obj[i] = sanitizeString(obj[i]);
        } else if (typeof obj[i] === 'object' && obj[i] !== null) {
          sanitize(obj[i]);
        }
      }
      return obj;
    }

    for (const key of Object.keys(obj)) {
      if (key.startsWith('$') || key.includes('.')) {
        delete obj[key];
      } else if (typeof obj[key] === 'string') {
        obj[key] = sanitizeString(obj[key]);
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
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
  securityHeaders
};
