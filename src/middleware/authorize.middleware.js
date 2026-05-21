const { fromString } = require('../enums/role.enum');

// Simple authorize middleware
exports.authorize = (...roles) => {
    const allowedRoles = roles.map((r) =>
        typeof r === 'string' ? fromString(r) : r,
    );

    return (req, res, next) => {
        const userRole = req.user ? Number(req.user.role) : null;
        if (!req.user || !allowedRoles.includes(userRole)) {
            res.status(403);
            return next(
                new Error(
                    `Role ${req.user ? req.user.role : 'unknown'} không có quyền thực hiện hành động này`,
                ),
            );
        }
        next();
    };
};
