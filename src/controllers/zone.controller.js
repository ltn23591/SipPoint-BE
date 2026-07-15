const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const ZoneService = require('../services/zone.service');

exports.getAll = catchAsync(async (req, res, next) => {
  const items = await ZoneService.getAll();
    res.status(200).json({
      success: true,
      count: items.length,
      data: items,
      message: 'Lấy danh sách khu vực thành công'
    });
});;

exports.getById = catchAsync(async (req, res, next) => {
  const item = await ZoneService.getById(req.params.id);
    if (!item) {
      return next(new AppError(`Không tìm thấy khu vực với ID: ${req.params.id}`, 404));
    }
    res.status(200).json({
      success: true,
      data: item,
      message: 'Lấy chi tiết khu vực thành công'
    });
});;

exports.create = catchAsync(async (req, res, next) => {
  const item = await ZoneService.create(req.body);
    res.status(201).json({
      success: true,
      data: item,
      message: 'Đã thêm khu vực thành công'
    });
});;

exports.update = catchAsync(async (req, res, next) => {
  const item = await ZoneService.update(req.params.id, req.body);
    if (!item) {
      return next(new AppError(`Không tìm thấy khu vực với ID: ${req.params.id}`, 404));
    }
    res.status(200).json({
      success: true,
      data: item,
      message: 'Cập nhật khu vực thành công'
    });
});;

exports.remove = catchAsync(async (req, res, next) => {
  const item = await ZoneService.delete(req.params.id);
    if (!item) {
      return next(new AppError(`Không tìm thấy khu vực với ID: ${req.params.id}`, 404));
    }
    res.status(200).json({
      success: true,
      data: {},
      message: 'Đã xóa khu vực thành công'
    });
});;
