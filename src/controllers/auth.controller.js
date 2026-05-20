const UserService = require('../services/user.service');
const sendEmail = require('../utils/email');
const logger = require('../config/logger');

// Lấy token từ model, tạo cookie và gửi response
const sendTokenResponse = (user, statusCode, res) => {
  // Tạo token
  const token = user.getSignedJwtToken();

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

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      res.status(401);
      throw new Error('Thông tin đăng nhập không hợp lệ');
    }

    sendTokenResponse(user, 200, res);
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
