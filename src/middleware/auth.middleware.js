const jwt = require('jsonwebtoken');
const Employee = require('../models/employee.model');
const Customer = require('../models/customer.model');
const AppError = require('../utils/AppError');
// Middleware xác thực user (cả nhân viên và khách hàng)
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
        return next(new AppError('Không có quyền truy cập, vui lòng đăng nhập', 401));
    }

    try {
        // Xác thực token
        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET || 'secret123',
        );

        // Lấy thông tin tài khoản từ DB dựa trên type được lưu trong token
        let user;
        if (decoded.type === 'customer') {
            user = await Customer.findById(decoded.id).select('-password').populate('tierId');
        } else {
            user = await Employee.findById(decoded.id).select('-password').populate('roleId');
        }

        if (!user) {
            return next(new AppError('Phiên đăng nhập đã hết hạn hoặc tài khoản không tồn tại, vui lòng đăng nhập lại.', 401));
        }

        // Kiểm tra trạng thái tài khoản
        if (decoded.type === 'customer') {
            if (!user.isActive) {
                return next(new AppError('Tài khoản của bạn đang bị khóa', 403));
            }
            if (!user.isVerified) {
                return next(new AppError('Vui lòng xác thực tài khoản trước khi truy cập', 403));
            }
        } else {
            if (user.isDeleted) {
                return next(new AppError('Tài khoản không tồn tại hoặc đã bị xóa', 401));
            }
            if (user.status === 'banned') {
                return next(new AppError('Tài khoản của bạn đang bị khóa', 403));
            }
        }

        req.user = user;
        next();
    } catch {
        return next(new AppError('Không có quyền truy cập, token không hợp lệ', 401)); 
    }
};
