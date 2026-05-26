const validator = require('validator');
const sendEmail = require('../utils/email');
const logger = require('../config/logger');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const User = require('../models/user.model');
const OTP = require('../models/otp.model');
const { USER_STATUS, OTP_TYPE } = require('../enums');

class AuthService {
  static async register(data) {
    const { name, email, password, role } = data;

    const userExists = await User.findOne({ email }).select('+password');
    if (userExists) {
      return { status: 400, success: false, message: 'Email đã được sử dụng' };
    }

    if (!name || !name.toString().trim()) {
      return { status: 400, success: false, message: 'Tên là bắt buộc' };
    }

    if (!email || !validator.isEmail(email)) {
      return { status: 400, success: false, message: 'Email không hợp lệ' };
    }

    if (!password || password.length < 6) {
      return { status: 400, success: false, message: 'Mật khẩu phải từ 6 ký tự trở lên' };
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({ name, email, password: hashedPassword, role });

    const otp = crypto.randomInt(100000, 999999).toString();
    await OTP.create({
      userId: user._id,
      code: otp,
      type: OTP_TYPE.REGISTER
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
      message: 'Đăng ký thành công. Vui lòng kiểm tra email để lấy mã xác thực kích hoạt tài khoản.' 
    };
  }

  static async login(email, password) {
    if (!email || !password) {
      return { status: 400, success: false, message: 'Vui lòng cung cấp email và mật khẩu' };
    }

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return { status: 401, success: false, message: 'Thông tin đăng nhập không hợp lệ' };
    }

    if (!user.isVerified || user.status === USER_STATUS.PENDING) {
      return { status: 403, success: false, message: 'Vui lòng xác thực email trước khi đăng nhập' };
    }

    if (user.status === USER_STATUS.BANNED) {
      return { status: 403, success: false, message: 'Tài khoản của bạn đã bị khóa' };
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return { status: 401, success: false, message: 'Sai thông tin đăng nhập' };
    }

    if (user.isTwoFactorEnabled) {
      const otp = crypto.randomInt(100000, 999999).toString();
      await OTP.create({
        userId: user._id,
        code: otp,
        type: OTP_TYPE.TWO_FACTOR
      });

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
        message: 'Vui lòng nhập mã OTP đã được gửi vào email của bạn',
      };
    }

    return { status: 200, success: true, message: 'Đăng nhập thành công', user };
  }

  static async verifyEmail(email, otp) {
    if (!email || !otp) {
      return { status: 400, success: false, message: 'Vui lòng cung cấp email và mã xác thực' };
    }

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return { status: 404, success: false, message: 'Tài khoản không tồn tại' };
    }

    if (user.isVerified) {
      return { status: 400, success: false, message: 'Tài khoản này đã được xác thực trước đó' };
    }

    const otpRecord = await OTP.findOne({
      userId: user._id,
      code: otp,
      type: OTP_TYPE.REGISTER
    });

    if (!otpRecord) {
      return { status: 400, success: false, message: 'Mã xác thực không chính xác hoặc đã hết hạn' };
    }

    await otpRecord.deleteOne();

    // Xác thực thành công
    user.isVerified = true;
    user.status = USER_STATUS.ACTIVE;
    await user.save({ validateBeforeSave: false });

    return { status: 200, success: true, message: 'Xác thực tài khoản thành công. Bạn đã được đăng nhập.', user };
  }

  static async resendVerifyEmail(email) {
    if (!email) {
      return { status: 400, success: false, message: 'Vui lòng cung cấp email' };
    }

    const user = await User.findOne({ email });
    if (!user) {
      return { status: 404, success: false, message: 'Tài khoản không tồn tại' };
    }

    if (user.isVerified) {
      return { status: 400, success: false, message: 'Tài khoản này đã được xác thực trước đó' };
    }

    const otp = crypto.randomInt(100000, 999999).toString();
    await OTP.deleteMany({ userId: user._id, type: OTP_TYPE.REGISTER });
    await OTP.create({
      userId: user._id,
      code: otp,
      type: OTP_TYPE.REGISTER
    });

    sendEmail({
      email: user.email,
      subject: 'Mã xác thực Email của bạn (Gửi lại)',
      template: 'otp',
      data: { name: user.name, otp: otp }
    }).catch(err => logger.error('Gửi email xác thực thất bại', err));

    return { status: 200, success: true, message: 'Mã xác thực mới đã được gửi vào email của bạn' };
  }

  static async enable2FA(userId) {
    const user = await User.findById(userId);
    if (!user) {
      return { status: 404, success: false, message: 'Không tìm thấy người dùng' };
    }
    
    if (user.isTwoFactorEnabled) {
      return { status: 400, success: false, message: 'Tài khoản đã được bật 2FA từ trước' };
    }

    const otp = crypto.randomInt(100000, 999999).toString();
    await OTP.deleteMany({ userId: user._id, type: OTP_TYPE.TWO_FACTOR });
    await OTP.create({
      userId: user._id,
      code: otp,
      type: OTP_TYPE.TWO_FACTOR
    });

    sendEmail({
      email: user.email,
      subject: 'Mã OTP bật tính năng 2FA',
      template: 'otp',
      data: { name: user.name, otp: otp }
    }).catch(err => logger.error('Lỗi gửi OTP enable 2FA', err));

    return { status: 200, success: true, message: 'Mã OTP đã được gửi vào email của bạn. Vui lòng kiểm tra hộp thư.' };
  }

  static async verifyEnable2FA(userId, otp) {
    const user = await User.findById(userId);

    const otpRecord = await OTP.findOne({
      userId: user._id,
      code: otp,
      type: OTP_TYPE.TWO_FACTOR
    });

    if (!otpRecord) {
      return { status: 400, success: false, message: 'Mã OTP không chính xác hoặc đã hết hạn' };
    }

    await otpRecord.deleteOne();

    user.isTwoFactorEnabled = true;
    await user.save({ validateBeforeSave: false });

    return { status: 200, success: true, message: 'Kích hoạt bảo mật 2 lớp thành công' };
  }

  static async login2FA(email, otp) {
    if (!email || !otp) {
      return { status: 400, success: false, message: 'Vui lòng cung cấp email và mã OTP' };
    }

    const user = await User.findOne({ email }).select('+password');

    if (!user || !user.isTwoFactorEnabled) {
      return { status: 400, success: false, message: 'Tài khoản không tồn tại hoặc chưa bật 2FA' };
    }

    const otpRecord = await OTP.findOne({
      userId: user._id,
      code: otp,
      type: OTP_TYPE.TWO_FACTOR
    });

    if (!otpRecord) {
      return { status: 400, success: false, message: 'Mã OTP không chính xác hoặc đã hết hạn' };
    }

    await otpRecord.deleteOne();

    return { status: 200, success: true, message: 'Đăng nhập thành công', user };
  }

  static async disable2FA(userId) {
    const user = await User.findById(userId);
    user.isTwoFactorEnabled = false;
    await user.save({ validateBeforeSave: false });

    await OTP.deleteMany({ userId: user._id, type: OTP_TYPE.TWO_FACTOR });

    return { status: 200, success: true, message: 'Đã tắt tính năng bảo mật 2 lớp' };
  }

  static async getMe(userId) {
    const user = await User.findById(userId).select('-password');
    if (!user) {
      return { status: 404, success: false, message: `Không tìm thấy người dùng với ID: ${userId}` };
    }
    return { status: 200, success: true, message: 'Lấy thông tin thành công', data: user };
  }
}

module.exports = AuthService;
