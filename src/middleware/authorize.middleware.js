// Middleware phân quyền
exports.authorize = (...roles) => {
    return (req, res, next) => {
        // Kiểm tra xem user có tồn tại và role của user có nằm trong mảng roles cho phép không
        if (!req.user || !roles.includes(req.user.role)) {
            res.status(403);
            return next(new Error('Bạn không có quyền thực hiện hành động này'));
        }
        next();
    };
};
