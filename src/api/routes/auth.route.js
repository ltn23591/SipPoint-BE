const express = require('express');

const {
  register,
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
  verifyEmail,
  resendVerifyEmail,
} = require('../../controllers/auth.controller');
const { protect } = require('../../middleware/auth.middleware');

const router = express.Router();

router.post('/register', register);

router.post('/verify-email', verifyEmail);

router.post('/resend-verify-email', resendVerifyEmail);

router.post('/login', login);

router.get('/logout', logout);

router.get('/me', protect, getMe);

router.post('/2fa/enable', protect, enable2FA);

router.post('/2fa/verify-enable', protect, verifyEnable2FA);

router.post('/2fa/login', login2FA);

router.post('/2fa/disable', protect, disable2FA);

/**
 * @swagger
 * /api/v1/auth/forgot-password:
 *   post:
 *     summary: Yêu cầu khôi phục mật khẩu (Gửi mã OTP qua email)
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: Mã OTP đã được gửi
 *       404:
 *         description: Không tìm thấy email
 */
router.post('/forgot-password', forgotPassword);

/**
 * @swagger
 * /api/v1/auth/verify-otp:
 *   post:
 *     summary: Xác minh mã OTP và sinh Reset Token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - activation_token
 *               - activation_code
 *             properties:
 *               activation_token:
 *                 type: string
 *               activation_code:
 *                 type: string
 *     responses:
 *       200:
 *         description: OTP xác thực thành công, trả về resetToken
 *       400:
 *         description: OTP sai hoặc hết hạn
 */
router.post('/verify-otp', verifyOtpCode);

/**
 * @swagger
 * /api/v1/auth/reset-password:
 *   post:
 *     summary: Đặt lại mật khẩu mới bằng Reset Token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - resetToken
 *               - newPassword
 *             properties:
 *               resetToken:
 *                 type: string
 *               newPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Đặt lại mật khẩu thành công
 *       400:
 *         description: Reset token sai hoặc hết hạn
 */
router.post('/reset-password', resetPassword);

module.exports = router;
