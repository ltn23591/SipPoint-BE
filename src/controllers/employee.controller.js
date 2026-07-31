const catchAsync = require('../utils/catchAsync');
const EmployeeService = require('../services/employee.service');

// @desc    Lấy danh sách tất cả nhân viên
// @route   GET /api/v1/employees
// @access  Private/Admin
class EmployeeController {
  static getEmployees = catchAsync(async (req, res, next) => {
  const data = await EmployeeService.getAllEmployees();
  return res.status(200).json({
    success: true,
    count: data.length,
    message: 'Lấy danh sách nhân viên thành công',
    data,
  });
});

// @desc    Lấy thông tin một nhân viên
// @route   GET /api/v1/employees/:id
// @access  Private/Admin
  static getEmployee = catchAsync(async (req, res, next) => {
  const data = await EmployeeService.getEmployeeById(req.params.id);
  return res.status(200).json({
    success: true,
    message: 'Lấy thông tin nhân viên thành công',
    data,
  });
});

// @desc    Tạo mới một nhân viên (Admin thêm tài khoản)
// @route   POST /api/v1/employees
// @access  Private/Admin
  static createEmployee = catchAsync(async (req, res, next) => {
  const data = await EmployeeService.createEmployee(req.body);
  return res.status(201).json({
    success: true,
    message: 'Tạo tài khoản nhân viên thành công',
    data,
  });
});

// @desc    Cập nhật thông tin nhân viên (phân quyền / đổi thông tin)
// @route   PUT /api/v1/employees/:id
// @access  Private/Admin
  static updateEmployee = catchAsync(async (req, res, next) => {
  const data = await EmployeeService.updateEmployee(req.params.id, req.body);
  return res.status(200).json({
    success: true,
    message: 'Cập nhật thông tin nhân viên thành công',
    data,
  });
});

// @desc    Xóa nhân viên
// @route   DELETE /api/v1/employees/:id
// @access  Private/Admin
  static deleteEmployee = catchAsync(async (req, res, next) => {
  const data = await EmployeeService.deleteEmployee(req.params.id);
  return res.status(200).json({
    success: true,
    data,
    message: 'Đã xóa nhân viên thành công',
  });
});

}

module.exports = EmployeeController;
