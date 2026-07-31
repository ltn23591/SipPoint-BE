const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const MembershipTierService = require('../services/membershipTier.service');

class MembershipTierController {
  static getByProgramId = catchAsync(async (req, res, next) => {
  const items = await MembershipTierService.getTiersByProgramId(req.params.programId);
    res.status(200).json({
      success: true,
      count: items.length,
      data: items,
      message: 'Lấy danh sách hạng thành viên thành công'
    });
});;

  static getCurrentTiers = catchAsync(async (req, res, next) => {
  const items = await MembershipTierService.getCurrentProgramTiers();
    res.status(200).json({
      success: true,
      count: items.length,
      data: items,
      message: 'Lấy hạng thành viên chương trình hiện tại thành công'
    });
});;

  static search = catchAsync(async (req, res, next) => {
  const result = await MembershipTierService.searchTiers(req.body);
    res.status(200).json(result);
});;

  static create = catchAsync(async (req, res, next) => {
  const item = await MembershipTierService.createTier(req.body);
    res.status(201).json({
      success: true,
      data: item,
      message: 'Tạo hạng thành viên thành công'
    });
});;

  static update = catchAsync(async (req, res, next) => {
  const id = req.body.id || req.body._id;
    if (!id) {
      return next(new AppError('Thiếu ID hạng thành viên cần cập nhật', 400));
    }
    const item = await MembershipTierService.updateTier(id, req.body);
    if (!item) {
      return next(new AppError(`Không tìm thấy hạng thành viên với ID: ${id}`, 404));
    }
    res.status(200).json({
      success: true,
      data: item,
      message: 'Cập nhật hạng thành viên thành công'
    });
});;

  static getById = catchAsync(async (req, res, next) => {
  const item = await MembershipTierService.getTierById(req.params.id);
    if (!item) {
      return next(new AppError(`Không tìm thấy hạng thành viên với ID: ${req.params.id}`, 404));
    }
    res.status(200).json({
      success: true,
      data: item,
      message: 'Lấy chi tiết hạng thành viên thành công'
    });
});;

}

module.exports = MembershipTierController;
