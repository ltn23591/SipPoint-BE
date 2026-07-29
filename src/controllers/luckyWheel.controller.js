const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const LuckyWheelService = require('../services/luckyWheel.service');

const requireCustomer = (req) => {
  if (!req.user || req.user.roleId) {
    throw new AppError('Chỉ khách hàng mới có thể thực hiện thao tác này', 403);
  }
};

class LuckyWheelController {
  // ── Admin ──
  static create = catchAsync(async (req, res) => {
    const createdById = req.user ? req.user._id : null;
    const data = await LuckyWheelService.createWheel(req.body, createdById);
    res.status(201).json({
      success: true,
      message: 'Tạo vòng quay thành công',
      data,
    });
  });

  static getAll = catchAsync(async (req, res) => {
    const result = await LuckyWheelService.getAllWheels(req.query);
    res.status(200).json({
      success: true,
      message: 'Lấy danh sách vòng quay thành công',
      data: result.wheels,
      pagination: result.pagination,
    });
  });

  static getById = catchAsync(async (req, res) => {
    const data = await LuckyWheelService.getWheelById(req.params.id);
    res.status(200).json({
      success: true,
      message: 'Lấy chi tiết vòng quay thành công',
      data,
    });
  });

  static update = catchAsync(async (req, res) => {
    const data = await LuckyWheelService.updateWheel(req.params.id, req.body);
    res.status(200).json({
      success: true,
      message: 'Cập nhật vòng quay thành công',
      data,
    });
  });

  static remove = catchAsync(async (req, res) => {
    const data = await LuckyWheelService.deleteWheel(req.params.id);
    res.status(200).json({
      success: true,
      data,
      message: 'Xóa vòng quay thành công',
    });
  });

  static updateStatus = catchAsync(async (req, res) => {
    const data = await LuckyWheelService.updateStatus(req.params.id, req.body.status);
    res.status(200).json({
      success: true,
      message: 'Cập nhật trạng thái vòng quay thành công',
      data,
    });
  });

  static getWheelSpins = catchAsync(async (req, res) => {
    const result = await LuckyWheelService.getWheelSpins(req.params.id, req.query);
    res.status(200).json({
      success: true,
      message: 'Lấy lịch sử trúng thưởng thành công',
      data: result.spins,
      pagination: result.pagination,
    });
  });

  // ── Khách hàng ──
  static getActive = catchAsync(async (req, res) => {
    requireCustomer(req);
    const data = await LuckyWheelService.getActiveWheelForCustomer(req.user);
    res.status(200).json({
      success: true,
      message: 'Lấy vòng quay hiện hành thành công',
      data,
    });
  });

  static spin = catchAsync(async (req, res) => {
    requireCustomer(req);
    const result = await LuckyWheelService.spin(req.params.id, req.user);
    res.status(200).json({
      success: true,
      message: result.message,
      data: {
        prize: result.prize,
        spinId: result.spinId,
        remainingSpins: result.remainingSpins,
      },
    });
  });

  static getMySpins = catchAsync(async (req, res) => {
    requireCustomer(req);
    const result = await LuckyWheelService.getMySpins(req.user._id, req.query);
    res.status(200).json({
      success: true,
      message: 'Lấy lịch sử quay thành công',
      data: result.spins,
      pagination: result.pagination,
    });
  });
}

module.exports = LuckyWheelController;
