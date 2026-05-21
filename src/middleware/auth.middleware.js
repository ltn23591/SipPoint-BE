const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

// Middleware xác thực user
exports.protect = async (req, res, next) => {
    let token;

    // Kiểm tra token trong headers (Bearer token)
    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        token = req.headers.authorization.split(' ')[1];
    }
    // Kiểm tra token trong cookie
    else if (req.cookies && req.cookies.token) {
        token = req.cookies.token;
    }

    if (!token) {
        res.status(401);
        return next(new Error('Không có quyền truy cập, vui lòng đăng nhập'));
    }

    try {
        // Xác thực token
        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET || 'secret123',
        );

        // Lấy thông tin user từ DB
        req.user = await User.findById(decoded.id).select('-password');
        next();
    } catch (error) {
        res.status(401);
        next(new Error('Không có quyền truy cập, token không hợp lệ'));
    }
};

// Note: `authorize` moved to `authorize.middleware.js`.
