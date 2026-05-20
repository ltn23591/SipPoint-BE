const UserService = require('../services/user.service');

// @desc    Lấy danh sách tất cả người dùng
// @route   GET /api/users
// @access  Private/Admin
exports.getUsers = async (req, res, next) => {
  try {
    const users = await UserService.getAllUsers();
    
    res.status(200).json({
      success: true,
      count: users.length,
      data: users,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Lấy thông tin một người dùng
// @route   GET /api/users/:id
// @access  Private/Admin
exports.getUser = async (req, res, next) => {
  try {
    const user = await UserService.getUserById(req.params.id);
    
    if (!user) {
      res.status(404);
      throw new Error(`Không tìm thấy người dùng với ID: ${req.params.id}`);
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Tạo mới một người dùng (Admin chỉ định)
// @route   POST /api/users
// @access  Private/Admin
exports.createUser = async (req, res, next) => {
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

    res.status(201).json({
      success: true,
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Cập nhật thông tin người dùng
// @route   PUT /api/users/:id
// @access  Private/Admin
exports.updateUser = async (req, res, next) => {
  try {
    const user = await UserService.updateUser(req.params.id, req.body);
    
    if (!user) {
      res.status(404);
      throw new Error(`Không tìm thấy người dùng với ID: ${req.params.id}`);
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Xóa người dùng
// @route   DELETE /api/users/:id
// @access  Private/Admin
exports.deleteUser = async (req, res, next) => {
  try {
    const user = await UserService.deleteUser(req.params.id);
    
    if (!user) {
      res.status(404);
      throw new Error(`Không tìm thấy người dùng với ID: ${req.params.id}`);
    }

    res.status(200).json({
      success: true,
      data: {},
      message: 'Đã xóa người dùng thành công'
    });
  } catch (error) {
    next(error);
  }
};
