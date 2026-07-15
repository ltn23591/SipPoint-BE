const catchAsync = require('../utils/catchAsync');
const StoreService = require('../services/store.service');

exports.getConfig = catchAsync(async (req, res, next) => {
  const config = await StoreService.getConfig();
    res.status(200).json({
      success: true,
      data: config,
      message: 'Lấy cấu hình cửa hàng thành công'
    });
});;

exports.updateConfig = catchAsync(async (req, res, next) => {
  const config = await StoreService.updateConfig(req.body);
    res.status(200).json({
      success: true,
      data: config,
      message: 'Cập nhật cấu hình cửa hàng thành công'
    });
});;
