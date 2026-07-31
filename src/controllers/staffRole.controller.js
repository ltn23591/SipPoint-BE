const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const StaffRoleService = require('../services/staffRole.service');

class StaffRoleController {
  static getAll = catchAsync(async (req, res, next) => {
  const items = await StaffRoleService.getAllRoles();
    res.status(200).json({
      success: true,
      count: items.length,
      data: items,
      message: 'Lấy danh sách vai trò thành công'
    });
});;

  static create = catchAsync(async (req, res, next) => {
  const item = await StaffRoleService.createRole(req.body);
    res.status(201).json({
      success: true,
      data: item,
      message: 'Tạo vai trò thành công'
    });
});;

  static update = catchAsync(async (req, res, next) => {
  const id = req.body.id || req.body._id;
    if (!id) {
      return next(new AppError('Thiếu ID vai trò cần cập nhật', 400));
    }
    const item = await StaffRoleService.updateRole(id, req.body);
    if (!item) {
      return next(new AppError(`Không tìm thấy vai trò với ID: ${id}`, 404));
    }
    res.status(200).json({
      success: true,
      data: item,
      message: 'Cập nhật vai trò thành công'
    });
});;

}

module.exports = StaffRoleController;
