const AuthService = require('../services/auth.service');
const EmployeeService = require('../services/employee.service');
const { sendTokenResponse } = require('../utils/response');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const Employee = require('../models/employee.model');
const bcrypt = require('bcrypt');
const sendEmail = require('../utils/email');

// @desc    Đăng ký tài khoản Khách hàng (Customer)
// @route   POST /api/v1/auth/customer/register
// @access  Public
exports.customerRegister = async (req, res, next) => {
  try {
    const result = await AuthService.customerRegister(req.body);
    return res.status(result.status).json(result);
  } catch (error) {
    next(error);
  }
};

// @desc    Đăng ký tài khoản Nhân viên (Employee / Admin)
// @route   POST /api/v1/auth/register
// @access  Public
exports.employeeRegister = async (req, res, next) => {
  try {
    const result = await AuthService.employeeRegister(req.body);
    if (result.user) {
      return sendTokenResponse(result.user, result.status, res, result.message, result.userType);
    }
    return res.status(result.status).json(result);
  } catch (error) {
    next(error);
  }
};

// @desc    Đăng nhập Khách hàng (Customer)
// @route   POST /api/v1/auth/customer/login
// @access  Public
exports.customerLogin = async (req, res, next) => {
  try {
    const { loginIdentifier, password } = req.body;
    const result = await AuthService.customerLogin(loginIdentifier, password);
    
    if (result.user) {
      return sendTokenResponse(result.user, result.status, res, result.message, result.userType);
    }
    
    return res.status(result.status).json(result);
  } catch (error) {
    next(error);
  }
};

// @desc    Đăng nhập Nhân viên (Employee)
// @route   POST /api/v1/auth/login
// @access  Public
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await AuthService.employeeLogin(email, password);
    
    if (result.user) {
      return sendTokenResponse(result.user, result.status, res, result.message, result.userType);
    }
    
    return res.status(result.status).json(result);
  } catch (error) {
    next(error);
  }
};

// -------------------------------------------------------------
// TÍNH NĂNG 2FA (BẢO MẬT 2 LỚP) CHO NHÂN VIÊN
// -------------------------------------------------------------

// @desc    Gửi mã OTP để BẬT 2FA
// @route   POST /api/v1/auth/2fa/enable
// @access  Private (Employee)
exports.enable2FA = async (req, res, next) => {
  try {
    const result = await AuthService.enable2FA(req.user.id);
    return res.status(result.status).json(result);
  } catch (error) {
    next(error);
  }
};

// @desc    Xác thực OTP để BẬT 2FA
// @route   POST /api/v1/auth/2fa/verify-enable
// @access  Private (Employee)
exports.verifyEnable2FA = async (req, res, next) => {
  try {
    const { otp } = req.body;
    const result = await AuthService.verifyEnable2FA(req.user.id, otp);
    return res.status(result.status).json(result);
  } catch (error) {
    next(error);
  }
};

// @desc    Xác thực 2FA để đăng nhập
// @route   POST /api/v1/auth/2fa/login
// @access  Public
exports.login2FA = async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    const result = await AuthService.login2FA(email, otp);
    
    if (result.user) {
      return sendTokenResponse(result.user, result.status, res, result.message, result.userType);
    }
    
    return res.status(result.status).json(result);
  } catch (error) {
    next(error);
  }
};

// @desc    Tắt tính năng 2FA
// @route   POST /api/v1/auth/2fa/disable
// @access  Private (Employee)
exports.disable2FA = async (req, res, next) => {
  try {
    const result = await AuthService.disable2FA(req.user.id);
    return res.status(result.status).json(result);
  } catch (error) {
    next(error);
  }
};

// @desc    Đăng xuất / Xóa cookie
// @route   GET /api/v1/auth/logout
// @access  Public
exports.logout = async (req, res, next) => {
  try {
    res.cookie('token', 'none', {
      expires: new Date(Date.now() + 10 * 1000), // Hết hạn trong 10 giây
      httpOnly: true,
    });

    res.status(200).json({
      success: true,
      data: {},
      message: 'Đăng xuất thành công'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Lấy thông tin tài khoản hiện tại (Cả Khách hàng và Nhân viên)
// @route   GET /api/v1/auth/me
// @access  Private
exports.getMe = async (req, res, next) => {
  try {
    const result = await AuthService.getMe(req.user.id);
    return res.status(result.status).json(result);
  } catch (error) {
    next(error);
  }
};

// @desc    Yêu cầu khôi phục mật khẩu nhân viên (Gửi OTP)
// @route   POST /api/v1/auth/forgot-password
// @access  Public
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp email' });
    }

    const employee = await EmployeeService.getEmployeeByEmail(email);
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản với email này' });
    }

    const otp = crypto.randomInt(100000, 999999).toString();
    
    // Tạo activation token (JWT stateless) chứa email và OTP
    const activationSecret = process.env.ACTIVATION_SECRET || 'activation_secret_123';
    const activationToken = jwt.sign(
      { email: employee.email, otp },
      activationSecret,
      { expiresIn: '5m' }
    );

    // Gửi email khôi phục mật khẩu
    await sendEmail({
      email: employee.email,
      subject: 'Mã xác thực khôi phục mật khẩu',
      template: 'reset-password',
      data: {
        name: employee.name,
        otp: otp
      }
    });

    res.status(200).json({
      success: true,
      activationToken,
      message: 'Mã OTP khôi phục mật khẩu đã được gửi đến email của bạn.'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Xác thực mã OTP và sinh Reset Token cho nhân viên
// @route   POST /api/v1/auth/verify-otp
// @access  Public
exports.verifyOtpCode = async (req, res, next) => {
  try {
    const { activation_token, activation_code } = req.body;

    if (!activation_token || !activation_code) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp đầy đủ activation_token và activation_code' });
    }

    const activationSecret = process.env.ACTIVATION_SECRET || 'activation_secret_123';
    let decoded;
    try {
      decoded = jwt.verify(activation_token, activationSecret);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(400).json({ success: false, message: 'Mã OTP đã hết hạn' });
      }
      return res.status(400).json({ success: false, message: 'Mã xác thực không hợp lệ' });
    }

    if (decoded.otp !== activation_code) {
      return res.status(400).json({ success: false, message: 'Mã OTP không chính xác' });
    }

    const employee = await EmployeeService.getEmployeeByEmail(decoded.email);
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản nhân viên' });
    }

    // Sinh reset token ngẫu nhiên
    const resetToken = crypto.randomBytes(20).toString('hex');
    employee.resetPasswordToken = resetToken;
    employee.resetPasswordTokenExpire = Date.now() + 10 * 60 * 1000; // Hết hạn trong 10 phút
    await employee.save({ validateBeforeSave: false });

    res.status(200).json({
      success: true,
      email: employee.email,
      resetToken,
      message: 'OTP đã được xác minh thành công'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Đặt lại mật khẩu nhân viên với Reset Token
// @route   POST /api/v1/auth/reset-password
// @access  Public
exports.resetPassword = async (req, res, next) => {
  try {
    const { resetToken, newPassword } = req.body;

    if (!resetToken || !newPassword) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp đầy đủ resetToken và mật khẩu mới' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Mật khẩu phải chứa ít nhất 6 ký tự' });
    }

    const employee = await Employee.findOne({
      resetPasswordToken: resetToken,
      resetPasswordTokenExpire: { $gt: Date.now() }
    }).select('+password');

    if (!employee) {
      return res.status(400).json({ success: false, message: 'Reset token không hợp lệ hoặc đã hết hạn. Vui lòng thử lại.' });
    }

    // Kiểm tra xem mật khẩu mới có trùng mật khẩu cũ không
    const isSame = await bcrypt.compare(newPassword, employee.password);
    if (isSame) {
      return res.status(400).json({ success: false, message: 'Mật khẩu mới không được trùng với mật khẩu cũ' });
    }

    // Hash mật khẩu mới
    const salt = await bcrypt.genSalt(10);
    employee.password = await bcrypt.hash(newPassword, salt);

    // Xóa Token và mở khóa tài khoản
    employee.resetPasswordToken = undefined;
    employee.resetPasswordTokenExpire = undefined;
    employee.loginAttempts = 0;
    employee.lockUntil = undefined;
    
    await employee.save({ validateBeforeSave: false });

    res.status(200).json({
      success: true,
      message: 'Mật khẩu đã được đặt lại thành công'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Xác thực Email khách hàng qua OTP
// @route   POST /api/v1/auth/customer/verify-email
// @access  Public
exports.customerVerifyEmail = async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    const result = await AuthService.customerVerifyEmail(email, otp);
    
    if (result.user) {
      return sendTokenResponse(result.user, result.status, res, result.message, result.userType);
    }
    
    return res.status(result.status).json(result);
  } catch (error) {
    next(error);
  }
};

// @desc    Gửi lại mã OTP xác thực cho khách hàng
// @route   POST /api/v1/auth/customer/resend-verify-email
// @access  Public
exports.customerResendVerifyEmail = async (req, res, next) => {
  try {
    const { email } = req.body;
    const result = await AuthService.customerResendVerifyEmail(email);
    return res.status(result.status).json(result);
  } catch (error) {
    next(error);
  }
};
