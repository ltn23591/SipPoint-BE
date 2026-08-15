const express = require('express');

const {
  customerRegister,
  employeeRegister,
  customerLogin,
  customerVerifyEmail,
  customerResendVerifyEmail,
  login,
  logout,
  getMe,
  forgotPassword,
  resetPassword,
  verifyOtpCode,
  changePassword,
  googleCallback,
  oauthSuccess,
} = require('../../controllers/auth.controller');
const passport = require('passport');
const { protect } = require('../../middleware/auth.middleware');
const validate = require('../../middleware/validate');
const authValidation = require('../../validations/auth.validation');
const { authLimiter, otpLimiter, strictLimiter } = require('../../middleware/rateLimit.middleware');

const router = express.Router();

// Route Đăng ký / Đăng nhập cho Khách hàng
router.post(
  '/customer/register',
  authLimiter,
  authValidation.customerRegister,
  validate,
  customerRegister,
);
router.post('/customer/verify-email', otpLimiter, customerVerifyEmail);
router.post('/customer/resend-verify-email', otpLimiter, customerResendVerifyEmail);
router.post('/customer/login', authLimiter, authValidation.customerLogin, validate, customerLogin);

// OAuth Google
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get(
  '/google/callback',
  googleCallback,
  oauthSuccess,
);

// Cung cấp các đường dẫn alias gốc để tương thích ngược với FE/Postman
router.post('/register', authLimiter, authValidation.employeeRegister, validate, employeeRegister);
router.post('/verify-email', otpLimiter, customerVerifyEmail);
router.post('/resend-verify-email', otpLimiter, customerResendVerifyEmail);

// Route Đăng nhập cho Nhân viên (Admin, Cashier, Barista, Waiter)
router.post('/login', authLimiter, authValidation.login, validate, login);

// Route Đăng xuất chung
router.get('/logout', logout);
router.post('/logout', logout); // Support POST logout from FE

// Lấy thông tin cá nhân (Cả Khách hàng và Nhân viên đều có thể gọi)
router.get('/me', protect, getMe);

// Đổi mật khẩu
router.put(
  '/change-password',
  protect,
  strictLimiter,
  authValidation.changePassword,
  validate,
  changePassword,
);

// Routes khôi phục mật khẩu cho Nhân viên
router.post(
  '/forgot-password',
  otpLimiter,
  authValidation.forgotPassword,
  validate,
  forgotPassword,
);
router.post('/verify-otp', otpLimiter, verifyOtpCode);
router.post(
  '/reset-password',
  strictLimiter,
  authValidation.resetPassword,
  validate,
  resetPassword,
);

module.exports = router;
