const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const ProductRecipeService = require('../services/productRecipe.service');
const { sendSuccess } = require('../utils/response');

class ProductRecipeController {
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
