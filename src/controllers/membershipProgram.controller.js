const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const MembershipProgramService = require('../services/membershipProgram.service');

class MembershipProgramController {
  static getCurrent = catchAsync(async (req, res, next) => {
  const item = await MembershipProgramService.getCurrentProgram();
    res.status(200).json({
      success: true,
      data: item,
      message: 'Lấy chương trình thành viên hiện tại thành công'
    });
});;

  static getById = catchAsync(async (req, res, next) => {
  const item = await MembershipProgramService.getProgramById(req.params.id);
    if (!item) {
      return next(new AppError(`Không tìm thấy chương trình thành viên với ID: ${req.params.id}`, 404));
    }
    res.status(200).json({
      success: true,
      data: item,
      message: 'Lấy chi tiết chương trình thành viên thành công'
    });
});;

  static create = catchAsync(async (req, res, next) => {
  const employeeId = req.user ? req.user._id : null;
    const item = await MembershipProgramService.createProgram(req.body, employeeId);
    res.status(201).json({
      success: true,
      data: item,
      message: 'Tạo chương trình thành viên thành công'
    });
});;

  static update = catchAsync(async (req, res, next) => {
  const id = req.body.id || req.body._id;
    if (!id) {
      return next(new AppError('Thiếu ID chương trình cần cập nhật', 400));
    }
    const item = await MembershipProgramService.updateProgram(id, req.body);
    if (!item) {
      return next(new AppError(`Không tìm thấy chương trình thành viên với ID: ${id}`, 404));
    }
    res.status(200).json({
      success: true,
      data: item,
      message: 'Cập nhật chương trình thành viên thành công'
    });
});;

  static search = catchAsync(async (req, res, next) => {
  const result = await MembershipProgramService.searchPrograms(req.body);
    res.status(200).json(result);
});;

  static approve = catchAsync(async (req, res, next) => {
  const id = req.body.id || req.body._id;
    if (!id) {
      return next(new AppError('Thiếu ID chương trình cần phê duyệt', 400));
    }
    const employeeId = req.user ? req.user._id : null;
    const item = await MembershipProgramService.approveProgram(id, employeeId, req.body.isApproved);
    if (!item) {
      return next(new AppError(`Không tìm thấy chương trình thành viên với ID: ${id}`, 404));
    }
    res.status(200).json({
      success: true,
      data: item,
      message: 'Phê duyệt chương trình thành viên thành công'
    });
});;

}

module.exports = MembershipProgramController;
