const catchAsync = require('../utils/catchAsync');
const StoreService = require('../services/store.service');

class StoreController {
  static getConfig = catchAsync(async (req, res, next) => {
  const config = await StoreService.getConfig();
    res.status(200).json({
      success: true,
      data: config,
      message: 'Lấy cấu hình cửa hàng thành công'
    });
});;

  static updateConfig = catchAsync(async (req, res, next) => {
  const employeeId = req.user ? req.user._id : null;
  const config = await StoreService.updateConfig(req.body, employeeId);
    res.status(200).json({
      success: true,
      data: config,
      message: 'Cập nhật cấu hình cửa hàng thành công'
    });
});;

}

module.exports = StoreController;
