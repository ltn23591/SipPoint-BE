const UserService = require('../services/user.service');

// @desc    Lấy danh sách tất cả người dùng
// @route   GET /api/users
// @access  Private/Admin
exports.getUsers = async (req, res, next) => {
  try {
    const result = await UserService.getAllUsers();
    return res.status(result.status).json(result);
  } catch (error) {
    next(error);
  }
};

// @desc    Lấy thông tin một người dùng
// @route   GET /api/users/:id
// @access  Private/Admin
exports.getUser = async (req, res, next) => {
  try {
    const result = await UserService.getUserById(req.params.id);
    return res.status(result.status).json(result);
  } catch (error) {
    next(error);
  }
};

// @desc    Tạo mới một người dùng (Admin chỉ định)
// @route   POST /api/users
// @access  Private/Admin
exports.createUser = async (req, res, next) => {
  try {
    const result = await UserService.createUser(req.body);
    if (result.user) {
      delete result.user;
    }
    return res.status(result.status).json(result);
  } catch (error) {
    next(error);
  }
};

// @desc    Cập nhật thông tin người dùng
// @route   PUT /api/users/:id
// @access  Private/Admin
exports.updateUser = async (req, res, next) => {
  try {
    const result = await UserService.updateUser(req.params.id, req.body);
    return res.status(result.status).json(result);
  } catch (error) {
    next(error);
  }
};

// @desc    Xóa người dùng
// @route   DELETE /api/users/:id
// @access  Private/Admin
exports.deleteUser = async (req, res, next) => {
  try {
    const result = await UserService.deleteUser(req.params.id);
    return res.status(result.status).json(result);
  } catch (error) {
    next(error);
  }
};
