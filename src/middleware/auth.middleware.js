const jwt = require('jsonwebtoken');
const Employee = require('../models/employee.model');
const Customer = require('../models/customer.model');

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
        res.status(401);
        return next(new Error('Không có quyền truy cập, vui lòng đăng nhập'));
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
            res.status(401);
            return next(new Error('Phiên đăng nhập đã hết hạn hoặc tài khoản không tồn tại, vui lòng đăng nhập lại.'));
        }

        req.user = user;
        next();
    } catch {
        res.status(401);
        next(new Error('Không có quyền truy cập, token không hợp lệ')); 
    }
};
