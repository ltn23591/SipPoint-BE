const catchAsync = require('../utils/catchAsync');
const VoucherService = require('../services/voucher.service');

class VoucherController {
  static create = catchAsync(async (req, res, next) => {
      const result = await VoucherService.createVoucher(req.body);
      res.status(result.status || 200).json(result);
    });

  static getAll = catchAsync(async (req, res, next) => {
      const result = await VoucherService.getAllVouchers();
      res.status(result.status || 200).json(result);
    });

  static getById = catchAsync(async (req, res, next) => {
      const result = await VoucherService.getVoucherById(req.params.id);
      res.status(result.status || 200).json(result);
    });

  static update = catchAsync(async (req, res, next) => {
      const result = await VoucherService.updateVoucher(req.params.id, req.body);
      res.status(result.status || 200).json(result);
    });

  static remove = catchAsync(async (req, res, next) => {
      const result = await VoucherService.deleteVoucher(req.params.id);
      res.status(result.status || 200).json(result);
    });

  static validate = catchAsync(async (req, res, next) => {
      const { code, orderValue } = req.body;
      if (!code || orderValue === undefined) {
        return res.status(400).json({ success: false, message: 'Vui lòng cung cấp mã code và giá trị đơn hàng' });
      }
      const result = await VoucherService.validateVoucher(code, Number(orderValue));
      res.status(result.status || 200).json(result);
    });

  static getRedeemable = catchAsync(async (req, res, next) => {
      const result = await VoucherService.getRedeemableVouchers();
      res.status(result.status || 200).json(result);
    });

  static redeem = catchAsync(async (req, res, next) => {
      // Chỉ tài khoản khách hàng mới được đổi điểm (nhân viên có roleId)
      if (!req.user || req.user.roleId) {
        return res.status(403).json({ success: false, message: 'Chỉ khách hàng mới có thể đổi điểm lấy voucher' });
      }
      const result = await VoucherService.redeemVoucherByPoints(req.user._id, req.params.id);
      res.status(result.status || 200).json(result);
    });
}

module.exports = VoucherController;
