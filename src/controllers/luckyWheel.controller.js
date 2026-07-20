const catchAsync = require('../utils/catchAsync');
const luckyWheelService = require('../services/luckyWheel.service');

class LuckyWheelController {
  static getConfigs = catchAsync(async (req, res, next) => {
    const result = await luckyWheelService.getConfigs();
    res.status(result.status).json(result);
  });

  static updateConfigs = catchAsync(async (req, res, next) => {
    const result = await luckyWheelService.updateConfigs(req.body);
    res.status(result.status).json(result);
  });

  static getInfo = catchAsync(async (req, res, next) => {
    const customerId = req.user ? req.user._id : req.body.customerId;
    if (!customerId) {
      return res.status(401).json({ success: false, message: 'Bạn cần đăng nhập để xem thông tin vòng quay' });
    }
    const result = await luckyWheelService.getLuckyWheelInfo(customerId);
    res.status(result.status).json(result);
  });

  static spin = catchAsync(async (req, res, next) => {
    const customerId = req.user ? req.user._id : req.body.customerId;
    const { usePoints } = req.body; // true: dùng 15 điểm, false: dùng lượt quay miễn phí
    
    if (!customerId) {
      return res.status(401).json({ success: false, message: 'Bạn cần đăng nhập để tham gia quay thưởng' });
    }

    const result = await luckyWheelService.spin(customerId, usePoints);
    res.status(result.status).json(result);
  });
}

module.exports = LuckyWheelController;
