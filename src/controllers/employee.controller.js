const EmployeeService = require('../services/employee.service');

// @desc    Lấy danh sách tất cả nhân viên
// @route   GET /api/v1/employees
// @access  Private/Admin
exports.getEmployees = async (req, res, next) => {
  try {
    const result = await EmployeeService.getAllEmployees();
    return res.status(result.status).json(result);
  } catch (error) {
    next(error);
  }
};

// @desc    Lấy thông tin một nhân viên
// @route   GET /api/v1/employees/:id
// @access  Private/Admin
exports.getEmployee = async (req, res, next) => {
  try {
    const result = await EmployeeService.getEmployeeById(req.params.id);
    return res.status(result.status).json(result);
  } catch (error) {
    next(error);
  }
};

// @desc    Tạo mới một nhân viên (Admin thêm tài khoản)
// @route   POST /api/v1/employees
// @access  Private/Admin
exports.createEmployee = async (req, res, next) => {
  try {
    const result = await EmployeeService.createEmployee(req.body);
    return res.status(result.status).json(result);
  } catch (error) {
    next(error);
  }
};

// @desc    Cập nhật thông tin nhân viên (phân quyền / đổi thông tin)
// @route   PUT /api/v1/employees/:id
// @access  Private/Admin
exports.updateEmployee = async (req, res, next) => {
  try {
    const result = await EmployeeService.updateEmployee(req.params.id, req.body);
    return res.status(result.status).json(result);
  } catch (error) {
    next(error);
  }
};

// @desc    Xóa nhân viên
// @route   DELETE /api/v1/employees/:id
// @access  Private/Admin
exports.deleteEmployee = async (req, res, next) => {
  try {
    const result = await EmployeeService.deleteEmployee(req.params.id);
    return res.status(result.status).json(result);
  } catch (error) {
    next(error);
  }
};
