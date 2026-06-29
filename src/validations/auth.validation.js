const { body } = require('express-validator');

const customerRegister = [
  body('fullName')
    .notEmpty().withMessage('Tên khách hàng là bắt buộc')
    .trim(),
  body('phone')
    .notEmpty().withMessage('Số điện thoại là bắt buộc')
    .isMobilePhone('vi-VN').withMessage('Số điện thoại không hợp lệ')
    .trim(),
  body('email')
    .notEmpty().withMessage('Email là bắt buộc')
    .isEmail().withMessage('Email không hợp lệ')
    .trim(),
  body('password')
    .notEmpty().withMessage('Mật khẩu là bắt buộc')
    .isLength({ min: 6 }).withMessage('Mật khẩu phải từ 6 ký tự trở lên')
];

const employeeRegister = [
  body('name')
    .notEmpty().withMessage('Họ và tên là bắt buộc')
    .trim(),
  body('email')
    .notEmpty().withMessage('Email là bắt buộc')
    .isEmail().withMessage('Email không hợp lệ')
    .trim(),
  body('password')
    .notEmpty().withMessage('Mật khẩu là bắt buộc')
    .isLength({ min: 6 }).withMessage('Mật khẩu phải từ 6 ký tự trở lên')
];

const login = [
  body('email')
    .notEmpty().withMessage('Email là bắt buộc')
    .isEmail().withMessage('Email không hợp lệ')
    .trim(),
  body('password')
    .notEmpty().withMessage('Mật khẩu là bắt buộc')
];

const customerLogin = [
  body('loginIdentifier')
    .notEmpty().withMessage('Vui lòng cung cấp số điện thoại hoặc email')
    .trim(),
  body('password')
    .notEmpty().withMessage('Mật khẩu là bắt buộc')
];

const forgotPassword = [
  body('email')
    .notEmpty().withMessage('Vui lòng cung cấp email')
    .isEmail().withMessage('Email không hợp lệ')
    .trim()
];

const resetPassword = [
  body('resetToken').notEmpty().withMessage('Vui lòng cung cấp reset token'),
  body('newPassword')
    .notEmpty().withMessage('Vui lòng cung cấp mật khẩu mới')
    .isLength({ min: 6 }).withMessage('Mật khẩu phải chứa ít nhất 6 ký tự')
];

const changePassword = [
  body('currentPassword').notEmpty().withMessage('Vui lòng điền mật khẩu cũ'),
  body('newPassword')
    .notEmpty().withMessage('Vui lòng điền mật khẩu mới')
    .isLength({ min: 6 }).withMessage('Mật khẩu mới phải từ 6 ký tự trở lên')
];

module.exports = {
  customerRegister,
  employeeRegister,
  login,
  customerLogin,
  forgotPassword,
  resetPassword,
  changePassword
};
