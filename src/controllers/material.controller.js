const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const MaterialService = require('../services/material.service');
const { sendSuccess, sendCreated } = require('../utils/response');
const { STOCK_MOVEMENT_TYPE } = require('../enums');

class MaterialController {
  // Danh sách nguyên liệu
  static getAll = catchAsync(async (req, res, next) => {
    const data = await MaterialService.getAll(req.query);
    return sendSuccess(res, data, 'Lấy danh sách nguyên liệu thành công');
  });

  // Danh sách nguyên liệu sắp hết / đã hết
  static getLowStock = catchAsync(async (req, res, next) => {
    const data = await MaterialService.getLowStockMaterials();
    return sendSuccess(res, data, 'Lấy danh sách nguyên liệu sắp hết thành công', data.length);
  });

  // Chi tiết nguyên liệu
  static getById = catchAsync(async (req, res, next) => {
    const data = await MaterialService.getById(req.params.id);
    if (!data) return next(new AppError('Không tìm thấy nguyên liệu', 404));
    return sendSuccess(res, data, 'Lấy chi tiết nguyên liệu thành công');
  });

  // Lịch sử biến động tồn kho
  static getMovements = catchAsync(async (req, res, next) => {
    const data = await MaterialService.getMovements(req.params.id, req.query);
    return sendSuccess(res, data, 'Lấy lịch sử biến động tồn kho thành công');
  });

  // Tạo nguyên liệu
  static create = catchAsync(async (req, res, next) => {
    const data = await MaterialService.create(req.body, req.user && req.user._id);
    return sendCreated(res, data, 'Đã thêm nguyên liệu thành công');
  });

  // Cập nhật nguyên liệu
  static update = catchAsync(async (req, res, next) => {
    const data = await MaterialService.update(req.params.id, req.body, req.user && req.user._id);
    if (!data) return next(new AppError('Không tìm thấy nguyên liệu', 404));
    return sendSuccess(res, data, 'Cập nhật nguyên liệu thành công');
  });

  // Nhập kho
  static importStock = catchAsync(async (req, res, next) => {
    const { quantity, note, cost } = req.body;
    const data = await MaterialService.importStock(
      req.params.id,
      quantity,
      note,
      req.user && req.user._id,
      cost
    );
    return sendSuccess(res, data, 'Nhập kho thành công');
  });

  // Điều chỉnh tồn kho thủ công (kiểm kê, hao hụt...)
  static adjustStock = catchAsync(async (req, res, next) => {
    const { quantityChange, note } = req.body;
    const data = await MaterialService.adjustStock(
      req.params.id,
      quantityChange,
      STOCK_MOVEMENT_TYPE.ADJUSTMENT,
      note,
      req.user && req.user._id
    );
    return sendSuccess(res, data, 'Điều chỉnh tồn kho thành công');
  });

  // Xóa mềm nguyên liệu
  static remove = catchAsync(async (req, res, next) => {
    const deleted = await MaterialService.remove(req.params.id);
    if (!deleted) return next(new AppError('Không tìm thấy nguyên liệu', 404));
    return sendSuccess(res, {}, 'Đã xóa nguyên liệu thành công');
  });

  // Khôi phục nguyên liệu đã xóa
  static restore = catchAsync(async (req, res, next) => {
    const restored = await MaterialService.restore(req.params.id);
    if (!restored) return next(new AppError('Không tìm thấy nguyên liệu', 404));
    return sendSuccess(res, restored, 'Đã khôi phục nguyên liệu thành công');
  });
}

module.exports = MaterialController;
