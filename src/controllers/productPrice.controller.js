const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const ProductPriceService = require('../services/productPrice.service');

exports.search = catchAsync(async (req, res, next) => {
  const result = await ProductPriceService.searchProductPrices(req.body);
    res.status(200).json(result);
});;

exports.createOrUpdate = catchAsync(async (req, res, next) => {
  const item = await ProductPriceService.createOrUpdateProductPrice(req.body);
    res.status(200).json({
      success: true,
      data: item,
      message: 'Cập nhật giá sản phẩm thành công'
    });
});;

exports.getById = catchAsync(async (req, res, next) => {
  const item = await ProductPriceService.getProductPriceById(req.params.id);
    if (!item) {
      return next(new AppError(`Không tìm thấy giá cho sản phẩm với ID: ${req.params.id}`, 404));
    }
    res.status(200).json({
      success: true,
      data: item,
      message: 'Lấy chi tiết giá sản phẩm thành công'
    });
});;
