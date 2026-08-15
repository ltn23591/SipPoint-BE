const Voucher = require('../models/voucher.model');
const CustomerVoucher = require('../models/customerVoucher.model');
const Campaign = require('../models/campaign.model');
const Customer = require('../models/customer.model');
const CustomerService = require('./customer.service');
const { DISCOUNT_TYPE, POINT_TRANSACTION_TYPE, CUSTOMER_VOUCHER_SOURCE } = require('../enums');
const AppError = require('../utils/AppError');

class VoucherService {
  // Voucher có 2 kênh phát hành độc lập cùng chia sẻ 1 kho usageLimit:
  // usedCount (nhập mã trực tiếp lúc đặt hàng) + issuedCount (phát vào ví qua đổi điểm/
  // campaign/trò chơi may mắn). Dùng chung 2 hàm này ở MỌI nơi kiểm tra/trừ kho để tránh
  // trường hợp mỗi kênh tự trừ riêng, khiến 1 voucher bị bán vượt gấp đôi kho cấu hình.
  static remainingStock(voucher) {
    return Math.max(0, (voucher.usageLimit ?? 0) - (voucher.usedCount ?? 0) - (voucher.issuedCount ?? 0));
  }

  // Điều kiện Mongo dùng trong findOneAndUpdate để trừ kho atomic (chống race).
  static stockAvailableFilter() {
    return { $expr: { $lt: [{ $add: ['$usedCount', '$issuedCount'] }, '$usageLimit'] } };
  }

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

    if (discountAmount > orderValue) {
      discountAmount = orderValue;
    }
    return discountAmount;
  }

  static async createVoucher(data) {
    const existing = await Voucher.findOne({ code: data.code.toUpperCase() });
    if (existing) {
      throw new AppError('Mã voucher đã tồn tại', 400);
    }
    const voucher = await Voucher.create({
      ...data,
      code: data.code.toUpperCase(),
    });
    return voucher;
  }

  // walletUsedCount: số voucher trong ví (issuedCount) đã thực sự được khách dùng cho
  // đơn hàng - CHỈ để hiển thị "Đã dùng" đầy đủ ở Portal, KHÔNG dùng cho việc trừ kho
  // (kho vẫn tính qua usedCount + issuedCount như remainingStock() ở trên).
  static async getAllVouchers() {
    const vouchers = await Voucher.find({}).sort({ createdAt: -1 }).lean();
    const walletUsedRows = await CustomerVoucher.aggregate([
      { $match: { voucherId: { $in: vouchers.map((v) => v._id) }, isUsed: true } },
      { $group: { _id: '$voucherId', count: { $sum: 1 } } },
    ]);
    const walletUsedMap = new Map(walletUsedRows.map((r) => [String(r._id), r.count]));
    return vouchers.map((v) => ({ ...v, walletUsedCount: walletUsedMap.get(String(v._id)) || 0 }));
  }

  static async getVoucherById(id) {
    const voucher = await Voucher.findById(id);
    if (!voucher) {
      throw new AppError('Không tìm thấy voucher', 404);
    }
    return voucher;
  }

  static async updateVoucher(id, data) {
    if (data.code) data.code = data.code.toUpperCase();
    const updated = await Voucher.findByIdAndUpdate(id, data, { new: true, runValidators: true });
    if (!updated) {
      throw new AppError('Không tìm thấy voucher', 404);
    }
    return updated;
  }

  static async deleteVoucher(id) {
    const deleted = await Voucher.findByIdAndDelete(id);
    if (!deleted) {
      throw new AppError('Không tìm thấy voucher', 404);
    }
    return {};
  }

  static async validateVoucher(code, orderValue) {
    const voucher = await Voucher.findOne({ code: code.toUpperCase(), isActive: 'active' });
    if (!voucher) {
      throw new AppError('Mã giảm giá không hợp lệ hoặc đã bị khóa', 404);
    }

    const now = new Date();
    if (now < voucher.startDate) {
      throw new AppError('Chương trình ưu đãi chưa bắt đầu', 400);
    }
    if (now > voucher.endDate) {
      throw new AppError('Mã giảm giá đã hết hạn sử dụng', 400);
    }

    if (VoucherService.remainingStock(voucher) <= 0) {
      throw new AppError('Mã giảm giá đã hết lượt sử dụng', 400);
    }

    if (orderValue < voucher.minOrderValue) {
      throw new AppError(`Đơn hàng tối thiểu phải từ ${voucher.minOrderValue.toLocaleString('vi-VN')}đ để áp dụng mã này`, 400);
    }

    const discountAmount = VoucherService.computeDiscount(voucher, orderValue);

    return {
      code: voucher.code,
      title: voucher.title,
      discountType: voucher.discountType,
      discountValue: voucher.discountValue,
      discountAmount,
      finalAmount: orderValue - discountAmount,
    };
  }

  static async validateWalletVoucher(customerVoucherId, customerId, orderValue) {
    const customerVoucher = await CustomerVoucher.findById(customerVoucherId).populate('voucherId');
    if (!customerVoucher || !customerVoucher.customerId.equals(customerId)) {
      throw new AppError('Không tìm thấy voucher trong ví của bạn', 404);
    }
    if (customerVoucher.isUsed) {
      throw new AppError('Voucher này đã được sử dụng', 400);
    }
    if (new Date() > customerVoucher.expiryDate) {
      throw new AppError('Voucher đã hết hạn sử dụng', 400);
    }

    const voucher = customerVoucher.voucherId;
    if (!voucher || voucher.isActive !== 'active') {
      throw new AppError('Voucher gốc không còn hiệu lực', 400);
    }

    let effectiveMinOrderValue = voucher.minOrderValue || 0;
    if (customerVoucher.campaignId) {
      const campaign = await Campaign.findById(customerVoucher.campaignId);

      if (!campaign || campaign.status !== 'ACTIVE') {
        throw new AppError('Chiến dịch của voucher này đã kết thúc hoặc bị hủy', 400);
      }

      const conditions = campaign.conditions || {};
      if (conditions.minOrderValue !== undefined && conditions.minOrderValue !== null) {
        effectiveMinOrderValue = conditions.minOrderValue;
      }

      const tw = conditions.timeWindow;
      if (tw && tw.startHour !== undefined && tw.endHour !== undefined) {
        const currentHour = Number(
          new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Ho_Chi_Minh', hour: 'numeric', hour12: false }).format(new Date())
        ) % 24;
        const inWindow =
          tw.startHour <= tw.endHour
            ? currentHour >= tw.startHour && currentHour < tw.endHour
            : currentHour >= tw.startHour || currentHour < tw.endHour;
        if (!inWindow) {
          throw new AppError(`Voucher chỉ áp dụng trong khung giờ ${tw.startHour}h - ${tw.endHour}h`, 400);
        }
      }
    }

    if (orderValue < effectiveMinOrderValue) {
      throw new AppError(`Đơn hàng tối thiểu phải từ ${effectiveMinOrderValue.toLocaleString('vi-VN')}đ để áp dụng voucher này`, 400);
    }

    const discountAmount = VoucherService.computeDiscount(voucher, orderValue);

    return {
      customerVoucherId: customerVoucher._id,
      voucherId: voucher._id,
      code: voucher.code,
      title: voucher.title,
      discountType: voucher.discountType,
      discountValue: voucher.discountValue,
      discountAmount,
      finalAmount: orderValue - discountAmount,
    };
  }

  static async getRedeemableVouchers() {
    const now = new Date();
    const vouchers = await Voucher.find({
      isActive: 'active',
      pointsCost: { $gt: 0 },
      startDate: { $lte: now },
      endDate: { $gte: now },
      ...VoucherService.stockAvailableFilter(),
    }).sort({ pointsCost: 1 });

    return vouchers;
  }

  static async redeemVoucherByPoints(customerId, voucherId) {
    const voucherInfo = await Voucher.findById(voucherId);
    if (!voucherInfo) {
      throw new AppError('Không tìm thấy voucher', 404);
    }
    if (voucherInfo.perCustomerLimit > 0) {
      const redeemedCount = await CustomerVoucher.countDocuments({ customerId, voucherId });
      if (redeemedCount >= voucherInfo.perCustomerLimit) {
        throw new AppError('Bạn đã đạt giới hạn đổi voucher này', 400);
      }
    }

    const now = new Date();
    const voucher = await Voucher.findOneAndUpdate(
      {
        _id: voucherId,
        isActive: 'active',
        pointsCost: { $gt: 0 },
        startDate: { $lte: now },
        endDate: { $gte: now },
        ...VoucherService.stockAvailableFilter(),
      },
      { $inc: { issuedCount: 1 } },
      { new: true }
    );
    if (!voucher) {
      throw new AppError('Voucher không khả dụng để đổi điểm hoặc đã hết lượt', 400);
    }

    const pointRes = await CustomerService.adjustPoints(
      customerId,
      -voucher.pointsCost,
      `Đổi ${voucher.pointsCost} điểm lấy voucher`,
      `Đổi điểm lấy voucher "${voucher.title}" (${voucher.code})`,
      POINT_TRANSACTION_TYPE.REWARD,
      { spentChange: 0, affectsCycle: false }
    );

    try {
      const customerVoucher = await CustomerVoucher.create({
        customerId,
        voucherId: voucher._id,
        title: voucher.title,
        expiryDate: voucher.endDate,
        source: CUSTOMER_VOUCHER_SOURCE.POINTS_REDEEM,
      });

      // Hook trong customer.model tự đồng bộ các nhóm AUTO bật cập nhật realtime
      await Customer.updateOne({ _id: customerId }, { $inc: { redeemCount: 1 } });

      return { customerVoucher, remainingPoints: pointRes.customer ? pointRes.customer.currentPoints : 0 };
    } catch (error) {
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
