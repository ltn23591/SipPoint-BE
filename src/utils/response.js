const jwt = require('jsonwebtoken');

const sendTokenResponse = (user, status, res, message = 'Thành công') => {
  // Tạo token
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
    .status(status)
    .cookie('token', token, options)
    .json({
      success: true,
      message,
      token,
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
};

module.exports = {
  sendTokenResponse
};
