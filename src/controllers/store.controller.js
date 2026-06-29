const StoreService = require('../services/store.service');

exports.getConfig = async (req, res, next) => {
  try {
    const config = await StoreService.getConfig();
    res.status(200).json({
      success: true,
      data: config,
      message: 'Lấy cấu hình cửa hàng thành công'
    });
  } catch (error) {
    next(error);
  }
};

exports.updateConfig = async (req, res, next) => {
  try {
    const config = await StoreService.updateConfig(req.body);
    res.status(200).json({
      success: true,
      data: config,
      message: 'Cập nhật cấu hình cửa hàng thành công'
    });
  } catch (error) {
    next(error);
  }
};
