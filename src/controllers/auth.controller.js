const catchAsync = require('../utils/catchAsync');
const AuthService = require('../services/auth.service');
const { sendTokenResponse } = require('../utils/response');
const jwt = require('jsonwebtoken');
const passport = require('passport');

exports.customerRegister = catchAsync(async (req, res, next) => {
  const result = await AuthService.customerRegister(req.body);
    return res.status(201).json({ success: true, ...result });
});;

exports.employeeRegister = catchAsync(async (req, res, next) => {
  const result = await AuthService.employeeRegister(req.body);
    return sendTokenResponse(result.user, 201, res, result.message, result.userType);
});;

exports.customerLogin = catchAsync(async (req, res, next) => {
  const { loginIdentifier, password } = req.body;
    const result = await AuthService.customerLogin(loginIdentifier, password);
    return sendTokenResponse(result.user, 200, res, result.message, result.userType);
});;

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;
    const result = await AuthService.employeeLogin(email, password);
    
    if (result.requires2FA) {
      return res.status(200).json({ success: true, ...result });
    }
    
    return sendTokenResponse(result.user, 200, res, result.message, result.userType);
});;

exports.enable2FA = catchAsync(async (req, res, next) => {
  const result = await AuthService.enable2FA(req.user.id);
    return res.status(200).json({ success: true, ...result });
});;

exports.verifyEnable2FA = catchAsync(async (req, res, next) => {
  const { otp } = req.body;
    const result = await AuthService.verifyEnable2FA(req.user.id, otp);
    return res.status(200).json({ success: true, ...result });
});;

exports.login2FA = catchAsync(async (req, res, next) => {
  const { email, otp } = req.body;
    const result = await AuthService.login2FA(email, otp);
    return sendTokenResponse(result.user, 200, res, result.message, result.userType);
});;

exports.disable2FA = catchAsync(async (req, res, next) => {
  const result = await AuthService.disable2FA(req.user.id);
    return res.status(200).json({ success: true, ...result });
});;

exports.logout = catchAsync(async (req, res, next) => {
  res.cookie('token', 'none', {
      expires: new Date(Date.now() + 10 * 1000), // Hết hạn trong 10 giây
      httpOnly: true,
    });

    res.status(200).json({
      success: true,
      data: {},
      message: 'Đăng xuất thành công'
    });
});;

exports.getMe = catchAsync(async (req, res, next) => {
  const result = await AuthService.getMe(req.user.id);
    return res.status(200).json({ success: true, ...result });
});;

exports.forgotPassword = catchAsync(async (req, res, next) => {
  const { email } = req.body;
    const result = await AuthService.forgotPassword(email);
    return res.status(200).json({ success: true, ...result });
});;

exports.verifyOtpCode = catchAsync(async (req, res, next) => {
  const { activation_token, activation_code } = req.body;
    const result = await AuthService.verifyOtpCode(activation_token, activation_code);
    return res.status(200).json({ success: true, ...result });
});;

exports.resetPassword = catchAsync(async (req, res, next) => {
  const { resetToken, newPassword } = req.body;
    const result = await AuthService.resetPassword(resetToken, newPassword);
    return res.status(200).json({ success: true, ...result });
});;

exports.customerVerifyEmail = catchAsync(async (req, res, next) => {
  const { email, otp } = req.body;
    const result = await AuthService.customerVerifyEmail(email, otp);
    return sendTokenResponse(result.user, 200, res, result.message, result.userType);
});;

exports.customerResendVerifyEmail = catchAsync(async (req, res, next) => {
  const { email } = req.body;
    const result = await AuthService.customerResendVerifyEmail(email);
    return res.status(200).json({ success: true, ...result });
});;

exports.changePassword = catchAsync(async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;
    const result = await AuthService.changePassword(req.user.id, currentPassword, newPassword);
    return res.status(200).json({ success: true, ...result });
});;

exports.googleCallback = (req, res, next) => {
  const code = req.query.code;
  if (code && global.oauthCache && global.oauthCache.has(code)) {
    console.log(`[OAuth Cache] Google callback double-request handled via cache for code: ${code.substring(0, 10)}...`);
    return res.redirect(global.oauthCache.get(code));
  }
  passport.authenticate('google', { session: false }, (err, user, info) => {
    if (err) {
      console.error("Google OAuth Error:", err);
      return res.redirect(`${process.env.FRONTEND_URL}/login?error=OAuthFailed`);
    }
    if (!user) {
      return res.redirect(`${process.env.FRONTEND_URL}/login?error=NoUser`);
    }
    req.user = user;
    next();
  })(req, res, next);
};

exports.oauthSuccess = catchAsync(async (req, res, next) => {
  const user = req.user;
  const frontendUrl = process.env.FRONTEND_URL;

  if (!user) {
    return res.redirect(`${frontendUrl}/login?error=OAuthFailed`);
  }

  const roleCode = 'customer';
  const token = jwt.sign({ id: user._id, role: roleCode, type: 'customer' }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });

  const cookieMaxAge = 30 * 24 * 60 * 60 * 1000;
  const options = {
    expires: new Date(Date.now() + cookieMaxAge),
    httpOnly: true,
  };
  if (process.env.NODE_ENV === 'production') {
    options.secure = true;
  }

  res.cookie('token', token, options);

  const redirectUrl = `${frontendUrl}/login-success?token=${token}&email=${encodeURIComponent(user.email || '')}&name=${encodeURIComponent(user.fullName || '')}&id=${user._id}`;

  // Cache the redirect URL for duplicate callback requests prevention
  const code = req.query.code;
  if (code) {
    if (!global.oauthCache) {
      global.oauthCache = new Map();
    }
    global.oauthCache.set(code, redirectUrl);
    // Expire the code from cache after 15 seconds
    setTimeout(() => {
      if (global.oauthCache) {
        global.oauthCache.delete(code);
      }
    }, 15000);
  }

  return res.redirect(redirectUrl);
});;
