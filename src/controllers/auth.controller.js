const AuthService = require('../services/auth.service');
const { sendTokenResponse } = require('../utils/response');

exports.customerRegister = async (req, res, next) => {
  try {
    const result = await AuthService.customerRegister(req.body);
    return res.status(201).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

exports.employeeRegister = async (req, res, next) => {
  try {
    const result = await AuthService.employeeRegister(req.body);
    return sendTokenResponse(result.user, 201, res, result.message, result.userType);
  } catch (error) {
    next(error);
  }
};

exports.customerLogin = async (req, res, next) => {
  try {
    const { loginIdentifier, password } = req.body;
    const result = await AuthService.customerLogin(loginIdentifier, password);
    return sendTokenResponse(result.user, 200, res, result.message, result.userType);
  } catch (error) {
    next(error);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await AuthService.employeeLogin(email, password);
    
    if (result.requires2FA) {
      return res.status(200).json({ success: true, ...result });
    }
    
    return sendTokenResponse(result.user, 200, res, result.message, result.userType);
  } catch (error) {
    next(error);
  }
};

exports.enable2FA = async (req, res, next) => {
  try {
    const result = await AuthService.enable2FA(req.user.id);
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

exports.verifyEnable2FA = async (req, res, next) => {
  try {
    const { otp } = req.body;
    const result = await AuthService.verifyEnable2FA(req.user.id, otp);
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

exports.login2FA = async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    const result = await AuthService.login2FA(email, otp);
    return sendTokenResponse(result.user, 200, res, result.message, result.userType);
  } catch (error) {
    next(error);
  }
};

exports.disable2FA = async (req, res, next) => {
  try {
    const result = await AuthService.disable2FA(req.user.id);
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

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

exports.getMe = async (req, res, next) => {
  try {
    const result = await AuthService.getMe(req.user.id);
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const result = await AuthService.forgotPassword(email);
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

exports.verifyOtpCode = async (req, res, next) => {
  try {
    const { activation_token, activation_code } = req.body;
    const result = await AuthService.verifyOtpCode(activation_token, activation_code);
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

exports.resetPassword = async (req, res, next) => {
  try {
    const { resetToken, newPassword } = req.body;
    const result = await AuthService.resetPassword(resetToken, newPassword);
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

exports.customerVerifyEmail = async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    const result = await AuthService.customerVerifyEmail(email, otp);
    return sendTokenResponse(result.user, 200, res, result.message, result.userType);
  } catch (error) {
    next(error);
  }
};

exports.customerResendVerifyEmail = async (req, res, next) => {
  try {
    const { email } = req.body;
    const result = await AuthService.customerResendVerifyEmail(email);
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const result = await AuthService.changePassword(req.user.id, currentPassword, newPassword);
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};
