const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const ProductRecipeService = require('../services/productRecipe.service');
const MaterialService = require('../services/material.service');
const { sendSuccess } = require('../utils/response');

class ProductRecipeController {
  // Số phần còn làm được (max makeable) + trạng thái còn/hết hàng cho danh sách sản phẩm
  static availability = catchAsync(async (req, res, next) => {
    let ids = req.query.productIds;
    if (typeof ids === 'string') ids = ids.split(',').map((s) => s.trim()).filter(Boolean);
    if (!Array.isArray(ids) || ids.length === 0) {
      return next(new AppError('Cần truyền danh sách productIds', 400));
    }
    const data = await MaterialService.getProductsAvailability(ids);
    return sendSuccess(res, data, 'Lấy khả năng phục vụ sản phẩm thành công', data.length);
  });

  // Lấy công thức của một sản phẩm
  static getByProduct = catchAsync(async (req, res, next) => {
    const data = await ProductRecipeService.getByProduct(req.params.productId);
    if (!data) return next(new AppError('Sản phẩm chưa có công thức', 404));
    return sendSuccess(res, data, 'Lấy công thức sản phẩm thành công');
  });

  // Tạo mới / cập nhật công thức cho sản phẩm
  static upsert = catchAsync(async (req, res, next) => {
    const data = await ProductRecipeService.upsert(
      req.params.productId,
      req.body.items,
      req.user && req.user._id
    );
    return sendSuccess(res, data, 'Lưu công thức sản phẩm thành công');
  });

  // Xóa công thức của sản phẩm
  static remove = catchAsync(async (req, res, next) => {
    const deleted = await ProductRecipeService.remove(req.params.productId);
    if (!deleted) return next(new AppError('Sản phẩm chưa có công thức', 404));
    return sendSuccess(res, {}, 'Đã xóa công thức sản phẩm thành công');
  });
}

module.exports = ProductRecipeController;
