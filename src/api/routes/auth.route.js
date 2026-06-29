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
  enable2FA,
  verifyEnable2FA,
  login2FA,
  disable2FA,
  forgotPassword,
  resetPassword,
  verifyOtpCode,
  changePassword,
} = require('../../controllers/auth.controller');
const { protect } = require('../../middleware/auth.middleware');
const validate = require('../../middleware/validate');
const authValidation = require('../../validations/auth.validation');

const router = express.Router();

// Route Đăng ký / Đăng nhập cho Khách hàng
router.post('/customer/register', authValidation.customerRegister, validate, customerRegister);
router.post('/customer/verify-email', customerVerifyEmail);
router.post('/customer/resend-verify-email', customerResendVerifyEmail);
router.post('/customer/login', authValidation.customerLogin, validate, customerLogin);

// Cung cấp các đường dẫn alias gốc để tương thích ngược với FE/Postman
router.post('/register', authValidation.employeeRegister, validate, employeeRegister);
router.post('/verify-email', customerVerifyEmail);
router.post('/resend-verify-email', customerResendVerifyEmail);

// Route Đăng nhập cho Nhân viên (Admin, Cashier, Barista, Waiter)
router.post('/login', authValidation.login, validate, login);

// Route Đăng xuất chung
router.get('/logout', logout);
router.post('/logout', logout); // Support POST logout from FE

// Lấy thông tin cá nhân (Cả Khách hàng và Nhân viên đều có thể gọi)
router.get('/me', protect, getMe);

// Đổi mật khẩu
router.put('/change-password', protect, authValidation.changePassword, validate, changePassword);

// Routes 2FA cho Nhân viên
router.post('/2fa/enable', protect, enable2FA);
router.post('/2fa/verify-enable', protect, verifyEnable2FA);
router.post('/2fa/login', login2FA);
router.post('/2fa/disable', protect, disable2FA);

// Routes khôi phục mật khẩu cho Nhân viên
router.post('/forgot-password', authValidation.forgotPassword, validate, forgotPassword);
router.post('/verify-otp', verifyOtpCode);
router.post('/reset-password', authValidation.resetPassword, validate, resetPassword);

module.exports = router;
