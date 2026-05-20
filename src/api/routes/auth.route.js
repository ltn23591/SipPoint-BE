const express = require('express');
const { check } = require('express-validator');
const validate = require('../../middleware/validate.middleware');
const { register, login, logout, getMe } = require('../../controllers/auth.controller');
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
 * /auth/register:
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
router.post('/register', [
  check('name', 'Tên là bắt buộc').notEmpty(),
  check('email', 'Email không hợp lệ').isEmail(),
  check('password', 'Mật khẩu phải từ 6 ký tự trở lên').isLength({ min: 6 }),
  validate
], register);

/**
 * @swagger
 * /auth/login:
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
router.post('/login', [
  check('email', 'Email không hợp lệ').isEmail(),
  check('password', 'Mật khẩu là bắt buộc').notEmpty(),
  validate
], login);

/**
 * @swagger
 * /auth/logout:
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
 * /auth/me:
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

module.exports = router;
