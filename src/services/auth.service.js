const sendEmail = require('../utils/email');
const logger = require('../config/logger');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const User = require('../models/user.model');
const { USER_STATUS, ROLE } = require('../enums');
const MESSAGES = require('../constants/messages');

class AuthService {
  static async register(data) {
    let { name, email, password, role } = data;

    if (!name || !name.toString().trim()) {
      return { status: 400, success: false, message: MESSAGES.VALIDATION.NAME_REQUIRED };
    }

    const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
    if (!email || !emailRegex.test(email)) {
      return { status: 400, success: false, message: MESSAGES.VALIDATION.EMAIL_INVALID };
    }

    if (!password || password.length < 6) {
      return { status: 400, success: false, message: MESSAGES.VALIDATION.PASSWORD_MIN_LENGTH };
    }

    if (role !== undefined && role !== null) {
      if (!Object.values(ROLE).includes(Number(role))) {
        return { status: 400, success: false, message: MESSAGES.VALIDATION.ROLE_INVALID };
      }
      role = Number(role);
    }

    const userExists = await User.findOne({ email }).select('+password');
    if (userExists) {
      return { status: 400, success: false, message: MESSAGES.AUTH.EMAIL_EXISTS };
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const otp = crypto.randomInt(100000, 999999).toString();
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role,
      verifyOTP: otp,
      verifyOTPExpire: Date.now() + 5 * 60 * 1000
    });

    // Gửi email chứa OTP
    sendEmail({
      email: user.email,
      subject: 'Mã xác thực Email đăng ký tài khoản',
      template: 'otp',
      data: { name: user.name, otp: otp }
    }).catch(err => logger.error('Gửi email xác thực thất bại', err));

    return { 
      status: 201, 
      success: true, 
      message: MESSAGES.AUTH.REGISTER_SUCCESS 
    };
  }

  static async login(email, password) {
    if (!email || !password) {
      return { status: 400, success: false, message: MESSAGES.VALIDATION.EMAIL_PASSWORD_REQUIRED };
    }

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return { status: 401, success: false, message: MESSAGES.AUTH.INVALID_CREDENTIALS };
    }

    if (!user.isVerified || user.status === USER_STATUS.PENDING) {
      return { status: 403, success: false, message: MESSAGES.AUTH.NOT_VERIFIED };
    }

    if (user.status === USER_STATUS.BANNED) {
      return { status: 403, success: false, message: MESSAGES.AUTH.ACCOUNT_BANNED };
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return { status: 401, success: false, message: MESSAGES.AUTH.WRONG_CREDENTIALS };
    }

    if (user.isTwoFactorEnabled) {
      const otp = crypto.randomInt(100000, 999999).toString();
      user.twoFactorOTP = otp;
      user.twoFactorOTPExpire = Date.now() + 5 * 60 * 1000;
      await user.save({ validateBeforeSave: false });

      sendEmail({
        email: user.email,
        subject: 'Mã xác thực OTP Đăng Nhập',
        template: 'otp',
        data: { name: user.name, otp: otp }
      }).catch(err => logger.error('Lỗi gửi OTP qua email', err));

      return {
        status: 200,
        success: true,
        requires2FA: true,
        email: user.email,
        message: MESSAGES.AUTH.OTP_SENT,
      };
    }

    return { status: 200, success: true, message: MESSAGES.AUTH.LOGIN_SUCCESS, user };
  }

  static async verifyEmail(email, otp) {
    if (!email || !otp) {
      return { status: 400, success: false, message: MESSAGES.VALIDATION.EMAIL_OTP_REQUIRED };
    }

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return { status: 404, success: false, message: MESSAGES.AUTH.ACCOUNT_NOT_FOUND };
    }

    if (user.isVerified) {
      return { status: 400, success: false, message: MESSAGES.AUTH.ALREADY_VERIFIED };
    }

    if (!user.verifyOTP || Date.now() > user.verifyOTPExpire) {
      return { status: 400, success: false, message: MESSAGES.AUTH.OTP_EXPIRED_OR_NOT_FOUND };
    }

    if (user.verifyOTP !== otp) {
      return { status: 400, success: false, message: MESSAGES.AUTH.OTP_INCORRECT };
    }

    // Xác thực thành công
    user.isVerified = true;
    user.status = USER_STATUS.ACTIVE;
    user.verifyOTP = undefined;
    user.verifyOTPExpire = undefined;
    await user.save({ validateBeforeSave: false });

    return { status: 200, success: true, message: MESSAGES.AUTH.VERIFY_SUCCESS, user };
  }

  static async resendVerifyEmail(email) {
    if (!email) {
      return { status: 400, success: false, message: MESSAGES.VALIDATION.EMAIL_REQUIRED };
    }

    const user = await User.findOne({ email });
    if (!user) {
      return { status: 404, success: false, message: MESSAGES.AUTH.ACCOUNT_NOT_FOUND };
    }

    if (user.isVerified) {
      return { status: 400, success: false, message: MESSAGES.AUTH.ALREADY_VERIFIED };
    }

    const otp = crypto.randomInt(100000, 999999).toString();
    user.verifyOTP = otp;
    user.verifyOTPExpire = Date.now() + 5 * 60 * 1000;
    await user.save({ validateBeforeSave: false });

    sendEmail({
      email: user.email,
      subject: 'Mã xác thực Email của bạn (Gửi lại)',
      template: 'otp',
      data: { name: user.name, otp: otp }
    }).catch(err => logger.error('Gửi email xác thực thất bại', err));

    return { status: 200, success: true, message: MESSAGES.AUTH.RESEND_OTP_SUCCESS };
  }

  static async enable2FA(userId) {
    const user = await User.findById(userId);
    if (!user) {
      return { status: 404, success: false, message: MESSAGES.USER.NOT_FOUND };
    }
    
    if (user.isTwoFactorEnabled) {
      return { status: 400, success: false, message: MESSAGES.AUTH.TWO_FACTOR_ALREADY_ENABLED };
    }

    const otp = crypto.randomInt(100000, 999999).toString();
    user.twoFactorOTP = otp;
    user.twoFactorOTPExpire = Date.now() + 5 * 60 * 1000;
    await user.save({ validateBeforeSave: false });

    sendEmail({
      email: user.email,
      subject: 'Mã OTP bật tính năng 2FA',
      template: 'otp',
      data: { name: user.name, otp: otp }
    }).catch(err => logger.error('Lỗi gửi OTP enable 2FA', err));

    return { status: 200, success: true, message: MESSAGES.AUTH.TWO_FACTOR_OTP_SENT };
  }

  static async verifyEnable2FA(userId, otp) {
    const user = await User.findById(userId);

    if (!user || !user.twoFactorOTP) {
      return { status: 400, success: false, message: MESSAGES.AUTH.TWO_FACTOR_SESSION_NOT_FOUND };
    }

    if (Date.now() > user.twoFactorOTPExpire) {
      return { status: 400, success: false, message: MESSAGES.AUTH.TWO_FACTOR_OTP_EXPIRED };
    }

    if (user.twoFactorOTP !== otp) {
      return { status: 400, success: false, message: MESSAGES.AUTH.TWO_FACTOR_OTP_INCORRECT };
    }

    user.isTwoFactorEnabled = true;
    user.twoFactorOTP = undefined;
    user.twoFactorOTPExpire = undefined;
    await user.save({ validateBeforeSave: false });

    return { status: 200, success: true, message: MESSAGES.AUTH.TWO_FACTOR_ENABLE_SUCCESS };
  }

  static async login2FA(email, otp) {
    if (!email || !otp) {
      return { status: 400, success: false, message: MESSAGES.VALIDATION.EMAIL_2FA_OTP_REQUIRED };
    }

    const user = await User.findOne({ email }).select('+password');

    if (!user || !user.isTwoFactorEnabled || !user.twoFactorOTP) {
      return { status: 400, success: false, message: MESSAGES.AUTH.TWO_FACTOR_LOGIN_ACCOUNT_NOT_FOUND };
    }

    if (Date.now() > user.twoFactorOTPExpire) {
      return { status: 400, success: false, message: MESSAGES.AUTH.TWO_FACTOR_OTP_EXPIRED };
    }

    if (user.twoFactorOTP !== otp) {
      return { status: 400, success: false, message: MESSAGES.AUTH.TWO_FACTOR_OTP_INCORRECT };
    }

    user.twoFactorOTP = undefined;
    user.twoFactorOTPExpire = undefined;
    await user.save({ validateBeforeSave: false });

    return { status: 200, success: true, message: MESSAGES.AUTH.LOGIN_SUCCESS, user };
  }

  static async disable2FA(userId) {
    const user = await User.findById(userId);
    user.isTwoFactorEnabled = false;
    user.twoFactorOTP = undefined;
    user.twoFactorOTPExpire = undefined;
    await user.save({ validateBeforeSave: false });

    return { status: 200, success: true, message: MESSAGES.AUTH.TWO_FACTOR_DISABLE_SUCCESS };
  }

  static async getMe(userId) {
    const user = await User.findById(userId).select('-password');
    if (!user) {
      return { status: 404, success: false, message: MESSAGES.USER.NOT_FOUND_WITH_ID(userId) };
    }
    return { status: 200, success: true, message: MESSAGES.USER.GET_SUCCESS, data: user };
  }
}

module.exports = AuthService;
