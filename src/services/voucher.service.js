const Voucher = require('../models/voucher.model');
const { DISCOUNT_TYPE } = require('../enums');

class VoucherService {
  static async createVoucher(data) {
    const existing = await Voucher.findOne({ code: data.code.toUpperCase() });
    if (existing) {
      return { status: 400, success: false, message: 'Mã voucher đã tồn tại' };
    }
    const voucher = await Voucher.create({
      ...data,
      code: data.code.toUpperCase(),
    });
    return { status: 201, success: true, message: 'Tạo voucher thành công', data: voucher };
  }

  static async getAllVouchers() {
    const vouchers = await Voucher.find({}).sort({ createdAt: -1 });
    return { status: 200, success: true, message: 'Lấy danh sách voucher thành công', data: vouchers };
  }

  static async getVoucherById(id) {
    const voucher = await Voucher.findById(id);
    if (!voucher) {
      return { status: 404, success: false, message: 'Không tìm thấy voucher' };
    }
    return { status: 200, success: true, message: 'Lấy chi tiết voucher thành công', data: voucher };
  }

  static async updateVoucher(id, data) {
    if (data.code) data.code = data.code.toUpperCase();
    const updated = await Voucher.findByIdAndUpdate(id, data, { new: true, runValidators: true });
    if (!updated) {
      return { status: 404, success: false, message: 'Không tìm thấy voucher' };
    }
    return { status: 200, success: true, message: 'Cập nhật voucher thành công', data: updated };
  }

  // Xóa voucher
  static async deleteVoucher(id) {
    const deleted = await Voucher.findByIdAndDelete(id);
    if (!deleted) {
      return { status: 404, success: false, message: 'Không tìm thấy voucher' };
    }
    return { status: 200, success: true, message: 'Xóa voucher thành công' };
  }

  // Kiểm tra (Validate) mã voucher khi áp dụng vào đơn hàng
  static async validateVoucher(code, orderValue) {
    const voucher = await Voucher.findOne({ code: code.toUpperCase(), isActive: 'active' });
    if (!voucher) {
      return { status: 404, success: false, message: 'Mã giảm giá không hợp lệ hoặc đã bị khóa' };
    }

    const now = new Date();
    if (now < voucher.startDate) {
      return { status: 400, success: false, message: 'Chương trình ưu đãi chưa bắt đầu' };
    }
    if (now > voucher.endDate) {
      return { status: 400, success: false, message: 'Mã giảm giá đã hết hạn sử dụng' };
    }

    if (voucher.usedCount >= voucher.usageLimit) {
      return { status: 400, success: false, message: 'Mã giảm giá đã hết lượt sử dụng' };
    }

    if (orderValue < voucher.minOrderValue) {
      return { 
        status: 400, 
        success: false, 
        message: `Đơn hàng tối thiểu phải từ ${voucher.minOrderValue.toLocaleString('vi-VN')}đ để áp dụng mã này` 
      };
    }

    // Tính toán số tiền được giảm
    let discountAmount = 0;
    if (voucher.discountType === DISCOUNT_TYPE.PERCENTAGE) {
      discountAmount = (orderValue * voucher.discountValue) / 100;
      if (voucher.maxDiscountLimit && discountAmount > voucher.maxDiscountLimit) {
        discountAmount = voucher.maxDiscountLimit;
      }
    } else {
      discountAmount = voucher.discountValue;
    }

    // Đảm bảo số tiền giảm không vượt quá trị giá đơn hàng
    if (discountAmount > orderValue) {
      discountAmount = orderValue;
    }

    return {
      status: 200,
      success: true,
      message: 'Mã giảm giá hợp lệ',
      data: {
        code: voucher.code,
        title: voucher.title,
        discountType: voucher.discountType,
        discountValue: voucher.discountValue,
        discountAmount,
        finalAmount: orderValue - discountAmount
      }
    };
  }
}

module.exports = VoucherService;
