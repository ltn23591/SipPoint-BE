const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const VoucherService = require('../services/voucher.service');

class VoucherController {
  static create = catchAsync(async (req, res, next) => {
    const data = await VoucherService.createVoucher(req.body);
    res.status(201).json({
      success: true,
      message: 'Tạo voucher thành công',
      data,
    });
  });

  static getAll = catchAsync(async (req, res, next) => {
    const data = await VoucherService.getAllVouchers();
    res.status(200).json({
      success: true,
      message: 'Lấy danh sách voucher thành công',
      data,
    });
  });

  static getById = catchAsync(async (req, res, next) => {
    const data = await VoucherService.getVoucherById(req.params.id);
    res.status(200).json({
      success: true,
      message: 'Lấy chi tiết voucher thành công',
      data,
    });
  });

  static update = catchAsync(async (req, res, next) => {
    const data = await VoucherService.updateVoucher(req.params.id, req.body);
    res.status(200).json({
      success: true,
      message: 'Cập nhật voucher thành công',
      data,
    });
  });

  static remove = catchAsync(async (req, res, next) => {
    const data = await VoucherService.deleteVoucher(req.params.id);
    res.status(200).json({
      success: true,
      data,
      message: 'Xóa voucher thành công',
    });
  });

  static validate = catchAsync(async (req, res, next) => {
    const { code, orderValue } = req.body;
    if (!code || orderValue === undefined) {
      throw new AppError('Vui lòng cung cấp mã code và giá trị đơn hàng', 400);
    }
    const data = await VoucherService.validateVoucher(code, Number(orderValue));
    res.status(200).json({
      success: true,
      message: 'Mã giảm giá hợp lệ',
      data,
    });
  });

  static validateWallet = catchAsync(async (req, res, next) => {
    const { customerVoucherId, orderValue } = req.body;
    if (!customerVoucherId || orderValue === undefined) {
      throw new AppError('Vui lòng cung cấp customerVoucherId và giá trị đơn hàng', 400);
    }
    const data = await VoucherService.validateWalletVoucher(customerVoucherId, req.user._id, Number(orderValue));
    res.status(200).json({
      success: true,
      message: 'Voucher hợp lệ',
      data,
    });
  });

  static getRedeemable = catchAsync(async (req, res, next) => {
    const data = await VoucherService.getRedeemableVouchers();
    res.status(200).json({
      success: true,
      message: 'Lấy danh sách voucher đổi điểm thành công',
      data,
    });
  });

  static redeem = catchAsync(async (req, res, next) => {
    if (!req.user || req.user.roleId) {
      throw new AppError('Chỉ khách hàng mới có thể đổi điểm lấy voucher', 403);
    }
    const data = await VoucherService.redeemVoucherByPoints(req.user._id, req.params.id);
    res.status(201).json({
      success: true,
      message: 'Đổi điểm lấy voucher thành công',
      data,
    });
  });
}

module.exports = VoucherController;
