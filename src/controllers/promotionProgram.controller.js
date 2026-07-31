const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const PromotionProgramService = require('../services/promotionProgram.service');

class PromotionProgramController {
  static search = catchAsync(async (req, res, next) => {
  const result = await PromotionProgramService.searchPrograms(req.body);
    res.status(200).json(result);
});;

  static getById = catchAsync(async (req, res, next) => {
  const item = await PromotionProgramService.getProgramById(req.params.id);
    if (!item) {
      return next(new AppError(`Không tìm thấy chương trình khuyến mãi với ID: ${req.params.id}`, 404));
    }
    res.status(200).json({
      success: true,
      data: item,
      message: 'Lấy chi tiết chương trình khuyến mãi thành công'
    });
});;

  static create = catchAsync(async (req, res, next) => {
  const employeeId = req.user ? req.user._id : null;
    const item = await PromotionProgramService.createProgram(req.body, employeeId);
    res.status(201).json({
      success: true,
      data: item,
      message: 'Tạo chương trình khuyến mãi thành công'
    });
});;

  static update = catchAsync(async (req, res, next) => {
  const id = req.body.id || req.body._id;
    if (!id) {
      return next(new AppError('Thiếu ID chương trình cần cập nhật', 400));
    }
    const item = await PromotionProgramService.updateProgram(id, req.body);
    if (!item) {
      return next(new AppError(`Không tìm thấy chương trình khuyến mãi với ID: ${id}`, 404));
    }
    res.status(200).json({
      success: true,
      data: item,
      message: 'Cập nhật chương trình khuyến mãi thành công'
    });
});;

  static remove = catchAsync(async (req, res, next) => {
  const item = await PromotionProgramService.deleteProgram(req.params.id);
    if (!item) {
      return next(new AppError(`Không tìm thấy chương trình khuyến mãi với ID: ${req.params.id}`, 404));
    }
    res.status(200).json({
      success: true,
      data: {},
      message: 'Xóa chương trình khuyến mãi thành công'
    });
});;

  static updateActive = catchAsync(async (req, res, next) => {
  const id = req.body.id || req.body._id;
    if (!id) {
      return next(new AppError('Thiếu ID chương trình cần cập nhật trạng thái', 400));
    }
    const item = await PromotionProgramService.updateActive(id, req.body.isActive);
    if (!item) {
      return next(new AppError(`Không tìm thấy chương trình khuyến mãi với ID: ${id}`, 404));
    }
    res.status(200).json({
      success: true,
      data: item,
      message: 'Cập nhật trạng thái hoạt động thành công'
    });
});;

  static approve = catchAsync(async (req, res, next) => {
  const id = req.body.id || req.body._id;
    if (!id) {
      return next(new AppError('Thiếu ID chương trình cần phê duyệt', 400));
    }
    const employeeId = req.user ? req.user._id : null;
    const item = await PromotionProgramService.approveProgram(id, employeeId, req.body.isApproved);
    if (!item) {
      return next(new AppError(`Không tìm thấy chương trình khuyến mãi với ID: ${id}`, 404));
    }
    res.status(200).json({
      success: true,
      data: item,
      message: 'Phê duyệt chương trình khuyến mãi thành công'
    });
});;

}

module.exports = PromotionProgramController;
