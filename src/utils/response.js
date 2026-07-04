const jwt = require('jsonwebtoken');

const sendTokenResponse = (user, status, res, message = 'Thành công', userType = 'employee') => {
  // Lấy role code từ roleId (nếu đã populate) hoặc fallback
  const roleCode = user.roleId && user.roleId.code ? user.roleId.code : (userType === 'customer' ? 'customer' : 'unknown');

  // Cấu hình thời gian hết hạn phiên linh hoạt theo đối tượng người dùng
  const isCustomer = userType === 'customer';
  const expiresIn = isCustomer ? '30d' : '1d';
  const cookieMaxAge = isCustomer 
    ? 30 * 24 * 60 * 60 * 1000 // 30 ngày
    : 1 * 24 * 60 * 60 * 1000; // 1 ngày

  // Tạo token
  const token = jwt.sign({ id: user._id, role: roleCode, type: userType }, process.env.JWT_SECRET || 'secret123', {
    expiresIn,
  });

  const options = {
    expires: new Date(Date.now() + cookieMaxAge),
    httpOnly: true,
  };

  if (process.env.NODE_ENV === 'production') {
    options.secure = true;
  }

  const responseData = {
    _id: user._id,
    name: user.name || user.fullName,
    email: user.email,
    role: roleCode
  };

  res
    .status(status)
    .cookie('token', token, options)
    .json({
      success: true,
      message,
      token,
      data: responseData
    });
};

module.exports = {
  sendTokenResponse
};
