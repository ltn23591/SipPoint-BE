const AuthService = require('../services/auth.service');
const { sendTokenResponse } = require('../utils/response');

// @desc    Đăng ký người dùng
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res, next) => {
  try {
    const result = await AuthService.register(req.body);
    // Remove status to not leak it into response body if we don't want it, but the user expects `res.status(result.status).json(result)`
    return res.status(result.status).json(result);
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
    const result = await AuthService.login(email, password);
    
    // Nếu service trả về user -> cấp token (Login thành công)
    if (result.user) {
      return sendTokenResponse(result.user, result.status, res, result.message);
    }
    
    // Nếu là lỗi hoặc yêu cầu 2FA
    return res.status(result.status).json(result);
  } catch (error) {
    next(error);
  }
};

// -------------------------------------------------------------
// XÁC THỰC EMAIL (SAU KHI ĐĂNG KÝ)
// -------------------------------------------------------------

// @desc    Xác thực Email qua OTP
// @route   POST /api/v1/auth/verify-email
// @access  Public
exports.verifyEmail = async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    const result = await AuthService.verifyEmail(email, otp);
    
    if (result.user) {
      return sendTokenResponse(result.user, result.status, res, result.message);
    }
    
    return res.status(result.status).json(result);
  } catch (error) {
    next(error);
  }
};

// @desc    Gửi lại mã OTP xác thực Email
// @route   POST /api/v1/auth/resend-verify-email
// @access  Public
exports.resendVerifyEmail = async (req, res, next) => {
  try {
    const { email } = req.body;
    const result = await AuthService.resendVerifyEmail(email);
    return res.status(result.status).json(result);
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
    const result = await AuthService.enable2FA(req.user.id);
    return res.status(result.status).json(result);
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
      return sendTokenResponse(result.user, result.status, res, result.message);
    }
    
    return res.status(result.status).json(result);
  } catch (error) {
    next(error);
  }
};

// @desc    Tắt tính năng 2FA
// @route   POST /api/v1/auth/2fa/disable
// @access  Private
exports.disable2FA = async (req, res, next) => {
  try {
    const result = await AuthService.disable2FA(req.user.id);
    return res.status(result.status).json(result);
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
    const result = await AuthService.getMe(req.user.id);
    return res.status(result.status).json(result);
  } catch (error) {
    next(error);
  }
};
