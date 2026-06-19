// Middleware phân quyền
exports.authorize = (...roles) => {
    return (req, res, next) => {
        // Kiểm tra xem user có tồn tại và role của user có nằm trong mảng roles cho phép không
        // Hỗ trợ cả kiểm tra roleId (nếu đã populate) hoặc role trực tiếp
        const userRole = req.user && req.user.roleId ? req.user.roleId.code : (req.user ? req.user.role : null);
        if (!req.user || !roles.includes(userRole)) {
            res.status(403);
            return next(new Error('Bạn không có quyền thực hiện hành động này'));
        }
        next();
    };
};
