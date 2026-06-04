const VoucherService = require('../services/voucher.service');

class VoucherController {
  static async create(req, res) {
    try {
      const result = await VoucherService.createVoucher(req.body);
      res.status(result.status).json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async getAll(req, res) {
    try {
      const result = await VoucherService.getAllVouchers();
      res.status(result.status).json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async getById(req, res) {
    try {
      const result = await VoucherService.getVoucherById(req.params.id);
      res.status(result.status).json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async update(req, res) {
    try {
      const result = await VoucherService.updateVoucher(req.params.id, req.body);
      res.status(result.status).json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async remove(req, res) {
    try {
      const result = await VoucherService.deleteVoucher(req.params.id);
      res.status(result.status).json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async validate(req, res) {
    try {
      const { code, orderValue } = req.body;
      if (!code || orderValue === undefined) {
        return res.status(400).json({ success: false, message: 'Vui lòng cung cấp mã code và giá trị đơn hàng' });
      }
      const result = await VoucherService.validateVoucher(code, Number(orderValue));
      res.status(result.status).json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}

module.exports = VoucherController;
