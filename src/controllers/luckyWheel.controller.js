const catchAsync = require('../utils/catchAsync');
const LuckyWheelService = require('../services/luckyWheel.service');

// Chỉ tài khoản khách hàng (không có roleId) mới được quay / xem vòng quay của mình
const requireCustomer = (req, res) => {
  if (!req.user || req.user.roleId) {
    res.status(403).json({ success: false, message: 'Chỉ khách hàng mới có thể thực hiện thao tác này' });
    return false;
  }
  return true;
};

class LuckyWheelController {
  // ── Admin ──
  static create = catchAsync(async (req, res) => {
    const createdById = req.user ? req.user._id : null;
    const result = await LuckyWheelService.createWheel(req.body, createdById);
    res.status(result.status).json(result);
  });

  static getAll = catchAsync(async (req, res) => {
    const result = await LuckyWheelService.getAllWheels(req.query);
    res.status(result.status).json(result);
  });

  static getById = catchAsync(async (req, res) => {
    const result = await LuckyWheelService.getWheelById(req.params.id);
    res.status(result.status).json(result);
  });

  static update = catchAsync(async (req, res) => {
    const result = await LuckyWheelService.updateWheel(req.params.id, req.body);
    res.status(result.status).json(result);
  });

  static remove = catchAsync(async (req, res) => {
    const result = await LuckyWheelService.deleteWheel(req.params.id);
    res.status(result.status).json(result);
  });

  static updateStatus = catchAsync(async (req, res) => {
    const result = await LuckyWheelService.updateStatus(req.params.id, req.body.status);
    res.status(result.status).json(result);
  });

  static getWheelSpins = catchAsync(async (req, res) => {
    const result = await LuckyWheelService.getWheelSpins(req.params.id, req.query);
    res.status(result.status).json(result);
  });

  // ── Khách hàng ──
  static getActive = catchAsync(async (req, res) => {
    if (!requireCustomer(req, res)) return;
    const result = await LuckyWheelService.getActiveWheelForCustomer(req.user);
    res.status(result.status).json(result);
  });

  static spin = catchAsync(async (req, res) => {
    if (!requireCustomer(req, res)) return;
    const result = await LuckyWheelService.spin(req.params.id, req.user);
    res.status(result.status).json(result);
  });

  static getMySpins = catchAsync(async (req, res) => {
    if (!requireCustomer(req, res)) return;
    const result = await LuckyWheelService.getMySpins(req.user._id, req.query);
    res.status(result.status).json(result);
  });
}

module.exports = LuckyWheelController;
