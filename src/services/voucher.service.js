const Voucher = require('../models/voucher.model');
const CustomerVoucher = require('../models/customerVoucher.model');
const Campaign = require('../models/campaign.model');
const Customer = require('../models/customer.model');
const CustomerService = require('./customer.service');
const CustomerSegmentService = require('./customerSegment.service');
const { DISCOUNT_TYPE, POINT_TRANSACTION_TYPE, CUSTOMER_VOUCHER_SOURCE } = require('../enums');

class VoucherService {
  static computeDiscount(voucher, orderValue) {
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
    return discountAmount;
  }
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
    const discountAmount = VoucherService.computeDiscount(voucher, orderValue);

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

  // Kiểm tra voucher trong ví khách hàng khi áp dụng vào đơn hàng
  // (bao gồm điều kiện bổ sung của campaign: đơn tối thiểu, khung giờ vàng)
  static async validateWalletVoucher(customerVoucherId, customerId, orderValue) {
    const customerVoucher = await CustomerVoucher.findById(customerVoucherId).populate('voucherId');
    if (!customerVoucher || !customerVoucher.customerId.equals(customerId)) {
      return { status: 404, success: false, message: 'Không tìm thấy voucher trong ví của bạn' };
    }
    if (customerVoucher.isUsed) {
      return { status: 400, success: false, message: 'Voucher này đã được sử dụng' };
    }
    if (new Date() > customerVoucher.expiryDate) {
      return { status: 400, success: false, message: 'Voucher đã hết hạn sử dụng' };
    }

    const voucher = customerVoucher.voucherId;
    if (!voucher || voucher.isActive !== 'active') {
      return { status: 400, success: false, message: 'Voucher gốc không còn hiệu lực' };
    }

    // Điều kiện bổ sung của campaign (nếu voucher được phát từ chiến dịch)
    let effectiveMinOrderValue = voucher.minOrderValue || 0;
    if (customerVoucher.campaignId) {
      const campaign = await Campaign.findById(customerVoucher.campaignId);

      if (!campaign || campaign.status !== 'ACTIVE') {
        return { status: 400, success: false, message: 'Chiến dịch của voucher này đã kết thúc hoặc bị hủy' };
      }

      const conditions = campaign.conditions || {};
      if (conditions.minOrderValue !== undefined && conditions.minOrderValue !== null) {
        effectiveMinOrderValue = conditions.minOrderValue;
      }

      const tw = conditions.timeWindow;
      if (tw && tw.startHour !== undefined && tw.endHour !== undefined) {
        // Lấy giờ hiện tại theo múi giờ Việt Nam
        const currentHour = Number(
          new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Ho_Chi_Minh', hour: 'numeric', hour12: false }).format(new Date())
        ) % 24;
        // Hỗ trợ khung giờ qua nửa đêm (VD: 22h - 2h)
        const inWindow =
          tw.startHour <= tw.endHour
            ? currentHour >= tw.startHour && currentHour < tw.endHour
            : currentHour >= tw.startHour || currentHour < tw.endHour;
        if (!inWindow) {
          return {
            status: 400,
            success: false,
            message: `Voucher chỉ áp dụng trong khung giờ ${tw.startHour}h - ${tw.endHour}h`,
          };
        }
      }
    }

    if (orderValue < effectiveMinOrderValue) {
      return {
        status: 400,
        success: false,
        message: `Đơn hàng tối thiểu phải từ ${effectiveMinOrderValue.toLocaleString('vi-VN')}đ để áp dụng voucher này`,
      };
    }

    const discountAmount = VoucherService.computeDiscount(voucher, orderValue);

    return {
      status: 200,
      success: true,
      message: 'Voucher hợp lệ',
      data: {
        customerVoucherId: customerVoucher._id,
        voucherId: voucher._id,
        code: voucher.code,
        title: voucher.title,
        discountType: voucher.discountType,
        discountValue: voucher.discountValue,
        discountAmount,
        finalAmount: orderValue - discountAmount,
      },
    };
  }

  // Danh sách voucher khách hàng có thể đổi bằng điểm
  static async getRedeemableVouchers() {
    const now = new Date();
    const vouchers = await Voucher.find({
      isActive: 'active',
      pointsCost: { $gt: 0 },
      startDate: { $lte: now },
      endDate: { $gte: now },
      $expr: { $lt: ['$issuedCount', '$usageLimit'] },
    }).sort({ pointsCost: 1 });

    return { status: 200, success: true, message: 'Lấy danh sách voucher đổi điểm thành công', data: vouchers };
  }

  // Khách hàng đổi điểm lấy voucher (phát vào ví)
  static async redeemVoucherByPoints(customerId, voucherId) {
    // 1. Kiểm tra giới hạn đổi trên mỗi khách hàng
    const voucherInfo = await Voucher.findById(voucherId);
    if (!voucherInfo) {
      return { status: 404, success: false, message: 'Không tìm thấy voucher' };
    }
    if (voucherInfo.perCustomerLimit > 0) {
      const redeemedCount = await CustomerVoucher.countDocuments({ customerId, voucherId });
      if (redeemedCount >= voucherInfo.perCustomerLimit) {
        return { status: 400, success: false, message: 'Bạn đã đạt giới hạn đổi voucher này' };
      }
    }

    // 2. Claim kho atomic: chỉ thành công khi voucher còn hiệu lực và còn lượt phát
    const now = new Date();
    const voucher = await Voucher.findOneAndUpdate(
      {
        _id: voucherId,
        isActive: 'active',
        pointsCost: { $gt: 0 },
        startDate: { $lte: now },
        endDate: { $gte: now },
        $expr: { $lt: ['$issuedCount', '$usageLimit'] },
      },
      { $inc: { issuedCount: 1 } },
      { new: true }
    );
    if (!voucher) {
      return { status: 400, success: false, message: 'Voucher không khả dụng để đổi điểm hoặc đã hết lượt' };
    }

    // 3. Trừ điểm của khách (không ảnh hưởng điểm xét hạng, không đổi totalSpent)
    const pointRes = await CustomerService.adjustPoints(
      customerId,
      -voucher.pointsCost,
      `Đổi ${voucher.pointsCost} điểm lấy voucher`,
      `Đổi điểm lấy voucher "${voucher.title}" (${voucher.code})`,
      POINT_TRANSACTION_TYPE.REWARD,
      { spentChange: 0, affectsCycle: false }
    );
    if (!pointRes.success) {
      // Bù trừ: hoàn lại lượt phát đã claim
      await Voucher.updateOne({ _id: voucher._id }, { $inc: { issuedCount: -1 } });
      return pointRes;
    }

    // 4. Phát voucher vào ví khách hàng
    try {
      const customerVoucher = await CustomerVoucher.create({
        customerId,
        voucherId: voucher._id,
        title: voucher.title,
        expiryDate: voucher.endDate,
        source: CUSTOMER_VOUCHER_SOURCE.POINTS_REDEEM,
      });

      await Customer.updateOne({ _id: customerId }, { $inc: { redeemCount: 1 } });
      await CustomerSegmentService.resyncRealtimeSegments();

      return {
        status: 201,
        success: true,
        message: 'Đổi điểm lấy voucher thành công',
        data: { customerVoucher, remainingPoints: pointRes.data.currentPoints },
      };
    } catch (error) {
      // Bù trừ: hoàn điểm và hoàn lượt phát
      await CustomerService.adjustPoints(
        customerId,
        voucher.pointsCost,
        'Hoàn điểm do đổi voucher thất bại',
        `Hoàn ${voucher.pointsCost} điểm do lỗi hệ thống khi đổi voucher "${voucher.title}"`,
        POINT_TRANSACTION_TYPE.ADJUSTMENT,
        { spentChange: 0, affectsCycle: false }
      );
      await Voucher.updateOne({ _id: voucher._id }, { $inc: { issuedCount: -1 } });
      throw error;
    }
  }
}

module.exports = VoucherService;
