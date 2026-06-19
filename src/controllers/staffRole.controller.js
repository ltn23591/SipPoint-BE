const StaffRoleService = require('../services/staffRole.service');

exports.getAll = async (req, res, next) => {
  try {
    const items = await StaffRoleService.getAllRoles();
    res.status(200).json({
      success: true,
      count: items.length,
      data: items,
      message: 'Lấy danh sách vai trò thành công'
    });
  } catch (error) {
    next(error);
  }
};

exports.create = async (req, res, next) => {
  try {
    const item = await StaffRoleService.createRole(req.body);
    res.status(201).json({
      success: true,
      data: item,
      message: 'Tạo vai trò thành công'
    });
  } catch (error) {
    next(error);
  }
};

exports.update = async (req, res, next) => {
  try {
    const id = req.body.id || req.body._id;
    if (!id) {
      res.status(400);
      throw new Error('Thiếu ID vai trò cần cập nhật');
    }
    const item = await StaffRoleService.updateRole(id, req.body);
    if (!item) {
      res.status(404);
      throw new Error(`Không tìm thấy vai trò với ID: ${id}`);
    }
    res.status(200).json({
      success: true,
      data: item,
      message: 'Cập nhật vai trò thành công'
    });
  } catch (error) {
    next(error);
  }
};
