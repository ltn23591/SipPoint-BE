const ToppingService = require('../services/topping.service');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');

class ToppingController {
  static getAll = catchAsync(async (req, res) => {
    const toppings = await ToppingService.getAll();
    res.status(200).json({
      success: true,
      data: toppings,
    });
  });

  static getById = catchAsync(async (req, res) => {
    const topping = await ToppingService.getById(req.params.id);
    if (!topping) {
      throw new AppError('Không tìm thấy topping', 404);
    }
    res.status(200).json({
      success: true,
      data: topping,
    });
  });

  static create = catchAsync(async (req, res) => {
    const topping = await ToppingService.create(req.body);
    res.status(201).json({
      success: true,
      message: 'Tạo topping thành công',
      data: topping,
    });
  });

  static update = catchAsync(async (req, res) => {
    const topping = await ToppingService.update(req.params.id, req.body);
    if (!topping) {
      throw new AppError('Không tìm thấy topping', 404);
    }
    res.status(200).json({
      success: true,
      message: 'Cập nhật topping thành công',
      data: topping,
    });
  });

  static delete = catchAsync(async (req, res) => {
    const topping = await ToppingService.delete(req.params.id);
    if (!topping) {
      throw new AppError('Không tìm thấy topping', 404);
    }
    res.status(200).json({
      success: true,
      message: 'Xóa topping thành công',
    });
  });
}

module.exports = ToppingController;
