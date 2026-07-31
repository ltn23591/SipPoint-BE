const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const ProductService = require('../services/product.service');
const { sendSuccess, sendCreated } = require('../utils/response');

// funcion for list product
exports.getAll = catchAsync(async (req, res, next) => {
  const data = await ProductService.getAll(req.query);
  return sendSuccess(res, data, 'Lấy danh sách sản phẩm thành công', data.length);
});

// funcion for single product info
exports.getById = catchAsync(async (req, res, next) => {
  const data = await ProductService.getById(req.params.id);
  if (!data) {
    return next(new AppError('Không tìm thấy sản phẩm', 404));
  }
  return sendSuccess(res, data, 'Lấy chi tiết sản phẩm thành công');
});

// funcion for add product
exports.create = catchAsync(async (req, res, next) => {
  const files = req.files && req.files.length > 0 ? req.files : null;
  const data = await ProductService.create(req.body, files);
  return sendCreated(res, data, 'Đã thêm sản phẩm thành công');
});

// funcion for update product
exports.update = catchAsync(async (req, res, next) => {
  const files = req.files && req.files.length > 0 ? req.files : null;
  const data = await ProductService.update(req.params.id, req.body, files);
  
  if (!data) {
    return next(new AppError('Không tìm thấy sản phẩm', 404));
  }
  
  return sendSuccess(res, data, 'Cập nhật sản phẩm thành công');
});

// funcion for removing product
exports.remove = catchAsync(async (req, res, next) => {
  const deleted = await ProductService.delete(req.params.id);
  if (!deleted) {
    return next(new AppError('Không tìm thấy sản phẩm', 404));
  }
  return sendSuccess(res, {}, 'Đã xóa sản phẩm thành công');
});

// function for restoring soft-deleted product
exports.restore = catchAsync(async (req, res, next) => {
  const restored = await ProductService.restore(req.params.id);
  if (!restored) {
    return next(new AppError('Không tìm thấy sản phẩm', 404));
  }
  return sendSuccess(res, restored, 'Đã khôi phục sản phẩm thành công');
});

// function for importing products from Excel
exports.importExcel = catchAsync(async (req, res, next) => {
  const file = req.files && req.files.length > 0 ? req.files[0] : null;
  
  const data = await ProductService.importExcel(file);
  
  return sendSuccess(res, data, `Đã import xong. Thành công: ${data.successCount}, Lỗi: ${data.errorCount}`);
});

// function for validating cart items
exports.validateCart = catchAsync(async (req, res, next) => {
  const items = req.body.items || [];
  const result = await ProductService.validateCart(items);
  return sendSuccess(res, result, 'Kiểm tra giỏ hàng hoàn tất');
});

