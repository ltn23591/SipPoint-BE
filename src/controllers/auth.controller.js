const UserService = require('../services/user.service');
const sendEmail = require('../utils/email');
const logger = require('../config/logger');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const User = require('../models/user.model'); // Needed for 2FA saving directly

const sendTokenResponse = (user, statusCode, res) => {
  // Tạo token tại controller thay vì ở model
  const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET || 'secret123', {
    expiresIn: '30d',
  });

  const options = {
    expires: new Date(
      Date.now() + 30 * 24 * 60 * 60 * 1000 // 30 ngày
    ),
    httpOnly: true,
  };

  if (process.env.NODE_ENV === 'production') {
    options.secure = true;
  }

  res
    .status(statusCode)
    .cookie('token', token, options)
    .json({
      success: true,
      token,
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
};

// @desc    Đăng ký người dùng
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;

    const userExists = await UserService.getUserByEmail(email);
    if (userExists) {
      res.status(400);
      throw new Error('Email đã được sử dụng');
    }

    const user = await UserService.createUser({
      name,
      email,
      password,
      role,
    });

    // Gửi email chào mừng bất đồng bộ (không await)
    sendEmail({
      email: user.email,
      subject: 'Chào mừng bạn đến với hệ thống!',
      template: 'welcome',
      data: {
        name: user.name,
        email: user.email,
        role: user.role
      }
    }).catch(err => logger.error('Gửi email thất bại', err));

    sendTokenResponse(user, 201, res);
  } catch (error) {
    next(error);
  }
};

// @desc    Đăng nhập
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400);
      throw new Error('Vui lòng cung cấp email và mật khẩu');
    }

    const user = await UserService.getUserByEmail(email);
    if (!user) {
      res.status(401);
      throw new Error('Thông tin đăng nhập không hợp lệ');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Sai thông tin đăng nhập' });
    }

    // Nếu user đã bật 2FA, tạo OTP và gửi qua Email
    if (user.isTwoFactorEnabled) {
      const otp = crypto.randomInt(100000, 999999).toString();
      user.twoFactorOTP = otp;
      user.twoFactorOTPExpire = Date.now() + 5 * 60 * 1000; // 5 phút
      await user.save({ validateBeforeSave: false });

      // Gửi OTP qua email (không await để không block)
      sendEmail({
        email: user.email,
        subject: 'Mã xác thực OTP Đăng Nhập',
        template: 'otp',
        data: {
          name: user.name,
          otp: otp
        }
      }).catch(err => logger.error('Lỗi gửi OTP qua email', err));

      return res.status(200).json({
        success: true,
        requires2FA: true,
        email: user.email,
        message: 'Vui lòng nhập mã OTP đã được gửi vào email của bạn',
      });
    }

    sendTokenResponse(user, 200, res);
  } catch (error) {
    next(error);
  }
};

// -------------------------------------------------------------
// TÍNH NĂNG 2FA (BẢO MẬT 2 LỚP)
// -------------------------------------------------------------

// @desc    Gửi mã OTP để BẬT 2FA
// @route   POST /api/v1/auth/2fa/enable
// @access  Private
exports.enable2FA = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
    }
    
    if (user.isTwoFactorEnabled) {
      return res.status(400).json({ success: false, message: 'Tài khoản đã được bật 2FA từ trước' });
    }

    // Tạo OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    user.twoFactorOTP = otp;
    user.twoFactorOTPExpire = Date.now() + 5 * 60 * 1000;
    await user.save({ validateBeforeSave: false });

    // Gửi email
    sendEmail({
      email: user.email,
      subject: 'Mã OTP bật tính năng 2FA',
      template: 'otp',
      data: { name: user.name, otp: otp }
    }).catch(err => logger.error('Lỗi gửi OTP enable 2FA', err));

    res.status(200).json({
      success: true,
      message: 'Mã OTP đã được gửi vào email của bạn. Vui lòng kiểm tra hộp thư.',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Xác thực OTP để BẬT 2FA
// @route   POST /api/v1/auth/2fa/verify-enable
// @access  Private
exports.verifyEnable2FA = async (req, res, next) => {
  try {
    const { otp } = req.body;
    const user = await User.findById(req.user.id);

    if (!user || !user.twoFactorOTP) {
      return res.status(400).json({ success: false, message: 'Không tìm thấy phiên xác thực. Hãy yêu cầu lại OTP.' });
    }

    if (Date.now() > user.twoFactorOTPExpire) {
      return res.status(400).json({ success: false, message: 'Mã OTP đã hết hạn' });
    }

    if (user.twoFactorOTP !== otp) {
      return res.status(400).json({ success: false, message: 'Mã OTP không chính xác' });
    }

    user.isTwoFactorEnabled = true;
    user.twoFactorOTP = undefined;
    user.twoFactorOTPExpire = undefined;
    await user.save({ validateBeforeSave: false });

    res.status(200).json({
      success: true,
      message: 'Kích hoạt bảo mật 2 lớp thành công',
    });
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

    if (!email || !otp) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp email và mã OTP' });
    }

    const user = await User.findOne({ email }).select('+password');

    if (!user || !user.isTwoFactorEnabled || !user.twoFactorOTP) {
      return res.status(400).json({ success: false, message: 'Tài khoản không tồn tại hoặc chưa gửi OTP' });
    }

    if (Date.now() > user.twoFactorOTPExpire) {
      return res.status(400).json({ success: false, message: 'Mã OTP đã hết hạn' });
    }

    if (user.twoFactorOTP !== otp) {
      return res.status(400).json({ success: false, message: 'Mã OTP không chính xác' });
    }

    // OTP đúng, xóa OTP trong DB và cấp token đăng nhập
    user.twoFactorOTP = undefined;
    user.twoFactorOTPExpire = undefined;
    await user.save({ validateBeforeSave: false });

    sendTokenResponse(user, 200, res);
  } catch (error) {
    next(error);
  }
};

// @desc    Tắt tính năng 2FA
// @route   POST /api/v1/auth/2fa/disable
// @access  Private
exports.disable2FA = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    user.isTwoFactorEnabled = false;
    user.twoFactorOTP = undefined;
    user.twoFactorOTPExpire = undefined;
    await user.save({ validateBeforeSave: false });

    res.status(200).json({
      success: true,
      message: 'Đã tắt tính năng bảo mật 2 lớp',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Đăng xuất / Xóa cookie
// @route   GET /api/auth/logout
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

// @desc    Lấy thông tin người dùng hiện tại
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res, next) => {
  try {
    const user = await UserService.getUserById(req.user.id);
    
    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};
