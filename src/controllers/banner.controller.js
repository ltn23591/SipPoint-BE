const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const BannerService = require('../services/banner.service');

class BannerController {
  static getAll = catchAsync(async (req, res, next) => {
    const banners = await BannerService.getAll(req.query);
    res.status(200).json({
      success: true,
      message: 'Lấy danh sách banner thành công',
      data: banners,
    });
  });

  static getPublic = catchAsync(async (req, res, next) => {
    const banners = await BannerService.getPublicActive();
    res.status(200).json({
      success: true,
      message: 'Lấy danh sách banner công khai thành công',
      data: banners,
    });
  });

  static create = catchAsync(async (req, res, next) => {
    const banner = await BannerService.create(req.body);
    res.status(201).json({
      success: true,
      message: 'Tạo banner mới thành công',
      data: banner,
    });
  });

  static update = catchAsync(async (req, res, next) => {
    const banner = await BannerService.update(req.params.id, req.body);
    if (!banner) throw new AppError('Không tìm thấy banner', 404);
    res.status(200).json({
      success: true,
      message: 'Cập nhật banner thành công',
      data: banner,
    });
  });

  static delete = catchAsync(async (req, res, next) => {
    const banner = await BannerService.delete(req.params.id);
    if (!banner) throw new AppError('Không tìm thấy banner', 404);
    res.status(200).json({
      success: true,
      message: 'Xóa banner thành công',
    });
  });
}

module.exports = BannerController;
