const catchAsync = require('../utils/catchAsync');
const CategoryService = require('../services/category.service');
const AppError = require('../utils/AppError');

exports.getAll = catchAsync(async (req, res, next) => {
  const items = await CategoryService.getAll();
    res.status(200).json({
      success: true,
      count: items.length,
      data: items,
      message: 'Lấy danh sách danh mục thành công'
    });
});

exports.getById = catchAsync(async (req, res, next) => {
  const item = await CategoryService.getById(req.params.id);
    if (!item) {
      return next(new AppError(`Không tìm thấy danh mục với ID: ${req.params.id}`, 404));
    }
    res.status(200).json({
      success: true,
      data: item,
      message: 'Lấy chi tiết danh mục thành công'
    });
});

exports.create = catchAsync(async (req, res, next) => {
  const item = await CategoryService.create(req.body);
    res.status(201).json({
      success: true,
      data: item,
      message: 'Đã thêm danh mục thành công'
    });
});

exports.update = catchAsync(async (req, res, next) => {
  const item = await CategoryService.update(req.params.id, req.body);
    if (!item) {
      return next(new AppError(`Không tìm thấy danh mục với ID: ${req.params.id}`, 404));
    }
    res.status(200).json({
      success: true,
      data: item,
      message: 'Cập nhật danh mục thành công'
    });
});

exports.remove = catchAsync(async (req, res, next) => {
  const item = await CategoryService.delete(req.params.id);
    if (!item) {
      return next(new AppError(`Không tìm thấy danh mục với ID: ${req.params.id}`, 404));
    }
    res.status(200).json({
      success: true,
      data: {},
      message: 'Đã xóa danh mục thành công'
    });
});
