const ProductPriceService = require('../services/productPrice.service');

exports.search = async (req, res, next) => {
  try {
    const result = await ProductPriceService.searchProductPrices(req.body);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

exports.createOrUpdate = async (req, res, next) => {
  try {
    const item = await ProductPriceService.createOrUpdateProductPrice(req.body);
    res.status(200).json({
      success: true,
      data: item,
      message: 'Cập nhật giá sản phẩm thành công'
    });
  } catch (error) {
    next(error);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const item = await ProductPriceService.getProductPriceById(req.params.id);
    if (!item) {
      res.status(404);
      throw new Error(`Không tìm thấy giá cho sản phẩm với ID: ${req.params.id}`);
    }
    res.status(200).json({
      success: true,
      data: item,
      message: 'Lấy chi tiết giá sản phẩm thành công'
    });
  } catch (error) {
    next(error);
  }
};
