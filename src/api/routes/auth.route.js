const express = require('express');

const { register, login, logout, getMe, enable2FA, verifyEnable2FA, login2FA, disable2FA } = require('../../controllers/auth.controller');
const { protect } = require('../../middleware/auth.middleware');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: API Quản lý Xác thực
 */

/**
 * @swagger
 * /api/v1/auth/register:
 *   post:
 *     summary: Đăng ký tài khoản mới
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: Đăng ký thành công và nhận cookie token
 *       400:
 *         description: Lỗi dữ liệu
 */
router.post('/register', register);

/**
 * @swagger
 * /api/v1/auth/login:
 *   post:
 *     summary: Đăng nhập
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Đăng nhập thành công và nhận cookie token
 *       401:
 *         description: Sai thông tin đăng nhập
 */
router.post('/login', login);

/**
 * @swagger
 * /api/v1/auth/logout:
 *   get:
 *     summary: Đăng xuất (xóa cookie)
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Đăng xuất thành công
 */
router.get('/logout', logout);

/**
 * @swagger
 * /api/v1/auth/me:
 *   get:
 *     summary: Lấy thông tin tài khoản đang đăng nhập
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Thông tin user
 *       401:
 *         description: Chưa đăng nhập
 */
router.get('/me', protect, getMe);

/**
 * @swagger
 * /auth/2fa/enable:
 *   post:
 *     summary: Bật cấu hình 2FA (Gửi mã OTP qua email)
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Đã gửi mã OTP qua email
 */
router.post('/2fa/enable', protect, enable2FA);

/**
 * @swagger
 * /auth/2fa/verify-enable:
 *   post:
 *     summary: Xác nhận OTP để chính thức BẬT 2FA
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - otp
 *             properties:
 *               otp:
 *                 type: string
 *     responses:
 *       200:
 *         description: Kích hoạt 2FA thành công
 */
router.post('/2fa/verify-enable', protect, verifyEnable2FA);

/**
 * @swagger
 * /auth/2fa/login:
 *   post:
 *     summary: Nhập mã OTP để đăng nhập khi có 2FA
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - otp
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               otp:
 *                 type: string
 *     responses:
 *       200:
 *         description: Đăng nhập thành công, trả về token
 */
router.post('/2fa/login', login2FA);

/**
 * @swagger
 * /auth/2fa/disable:
 *   post:
 *     summary: Tắt tính năng bảo mật 2 lớp
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Tắt 2FA thành công
 */
router.post('/2fa/disable', protect, disable2FA);

module.exports = router;
