const Customer = require('../models/customer.model');
const Voucher = require('../models/voucher.model');
const CustomerVoucher = require('../models/customerVoucher.model');
const LuckyWheelConfig = require('../models/luckyWheelConfig.model');
const CustomerService = require('./customer.service');
const { POINT_TRANSACTION_TYPE } = require('../enums');

const DEFAULT_CONFIGS = [
  { slotIndex: 0, type: "LUCK", value: 0, label: "Chúc may mắn", probability: 20 },
  { slotIndex: 1, type: "POINTS", value: 10, label: "10 Điểm Thưởng", probability: 20 },
  { slotIndex: 2, type: "POINTS", value: 20, label: "20 Điểm Thưởng", probability: 10 },
  { slotIndex: 3, type: "LUCK", value: 0, label: "Chúc bạn may mắn lần sau", probability: 20 },
  { slotIndex: 4, type: "POINTS", value: 15, label: "15 Điểm Thưởng", probability: 10 },
  { slotIndex: 5, type: "POINTS", value: 30, label: "30 Điểm Thưởng", probability: 5 },
  { slotIndex: 6, type: "POINTS", value: 50, label: "50 Điểm Thưởng", probability: 5 },
  { slotIndex: 7, type: "LUCK", value: 1, label: "Thêm một lượt quay", probability: 10 }
];

class LuckyWheelService {
  /**
   * Tự động khởi tạo dữ liệu mẫu nếu chưa có cấu hình trong DB
   */
  static async checkAndSeedConfigs() {
    const count = await LuckyWheelConfig.countDocuments();
    if (count === 0) {
      await LuckyWheelConfig.insertMany(DEFAULT_CONFIGS);
    }
  }

  /**
   * Lấy danh sách cấu hình các ô phần thưởng của vòng quay
   */
  static async getConfigs() {
    await this.checkAndSeedConfigs();
    const configs = await LuckyWheelConfig.find({}).populate('voucherId').sort({ slotIndex: 1 });
    return { status: 200, success: true, data: configs };
  }

  /**
   * Cập nhật danh sách cấu hình (Yêu cầu đúng 8 phần thưởng và tổng tỷ lệ = 100)
   */
  static async updateConfigs(configsArray) {
    if (!Array.isArray(configsArray) || configsArray.length !== 8) {
      return { status: 400, success: false, message: 'Cấu hình vòng quay phải có đúng 8 phần thưởng (ô)' };
    }

    const totalProbability = configsArray.reduce((sum, item) => sum + (Number(item.probability) || 0), 0);
    if (totalProbability !== 100) {
      return { status: 400, success: false, message: `Tổng xác suất trúng phải bằng 100% (Hiện tại: ${totalProbability}%)` };
    }

    // Cập nhật từng ô một cách an toàn
    for (const item of configsArray) {
      await LuckyWheelConfig.findOneAndUpdate(
        { slotIndex: item.slotIndex },
        {
          label: item.label,
          type: item.type,
          voucherId: item.type === "VOUCHER" ? (item.voucherId || null) : null,
          value: Number(item.value) || 0,
          probability: Number(item.probability) || 0
        },
        { upsert: true, new: true }
      );
    }

    const updated = await LuckyWheelConfig.find({}).populate('voucherId').sort({ slotIndex: 1 });
    return { status: 200, success: true, message: 'Lưu cấu hình vòng quay thành công', data: updated };
  }

  /**
   * Lấy thông tin số lượt quay miễn phí và điểm tích lũy của khách hàng
   */
  static async getLuckyWheelInfo(customerId) {
    const customer = await Customer.findById(customerId);
    if (!customer) {
      return { status: 404, success: false, message: 'Không tìm thấy khách hàng' };
    }
    return {
      status: 200,
      success: true,
      data: {
        currentPoints: customer.currentPoints,
        luckySpins: customer.luckySpins || 0
      }
    };
  }

  /**
   * Thực hiện quay vòng quay may mắn bằng dữ liệu CSDL
   */
  static async spin(customerId, usePoints) {
    const customer = await Customer.findById(customerId);
    if (!customer) {
      return { status: 404, success: false, message: 'Không tìm thấy khách hàng' };
    }

    if (usePoints) {
      // Dùng điểm để quay (15 điểm)
      if (customer.currentPoints < 15) {
        return { status: 400, success: false, message: 'Bạn không đủ điểm để thực hiện lượt quay (yêu cầu 15 điểm)' };
      }
    } else {
      // Dùng lượt quay miễn phí
      if ((customer.luckySpins || 0) <= 0) {
        return { status: 400, success: false, message: 'Bạn không còn lượt quay miễn phí' };
      }
    }

    // 1. Tải danh sách giải thưởng động từ database
    await this.checkAndSeedConfigs();
    const prizes = await LuckyWheelConfig.find({}).populate('voucherId').sort({ slotIndex: 1 });

    // Lựa chọn giải thưởng ngẫu nhiên theo tỷ lệ trọng số
    let totalWeight = prizes.reduce((sum, p) => sum + p.probability, 0);
    let randomNum = Math.floor(Math.random() * totalWeight);
    let selectedPrize = prizes[0];

    for (let i = 0; i < prizes.length; i++) {
      randomNum -= prizes[i].probability;
      if (randomNum < 0) {
        selectedPrize = prizes[i];
        break;
      }
    }

    // 2. Khấu trừ chi phí quay
    let pointRes = null;
    if (usePoints) {
      pointRes = await CustomerService.adjustPoints(
        customerId,
        -15,
        'Vòng quay may mắn',
        'Trừ 15 điểm tham gia quay thưởng',
        POINT_TRANSACTION_TYPE.LUCKY_SPIN,
        { spentChange: 0, affectsCycle: false }
      );
      if (!pointRes.success) {
        return { status: 500, success: false, message: 'Lỗi trừ điểm của tài khoản' };
      }
    } else {
      customer.luckySpins = Math.max(0, (customer.luckySpins || 0) - 1);
      await customer.save();
    }

    // 3. Phân bổ phần thưởng thực tế
    let rewardData = {};
    if (selectedPrize.type === "POINTS") {
      // Cộng điểm thưởng
      const adjustRes = await CustomerService.adjustPoints(
        customerId,
        selectedPrize.value,
        'Vòng quay may mắn',
        `Trúng thưởng ${selectedPrize.value} điểm từ vòng quay`,
        POINT_TRANSACTION_TYPE.LUCKY_SPIN,
        { spentChange: 0, affectsCycle: false }
      );
      rewardData = {
        pointsEarned: selectedPrize.value,
        currentPoints: adjustRes.success ? adjustRes.data.currentPoints : customer.currentPoints
      };
    } else if (selectedPrize.type === "VOUCHER") {
      const voucher = selectedPrize.voucherId;
      if (!voucher || voucher.isActive !== 'active') {
        // Hoàn lại chi phí nếu trúng voucher không hợp lệ
        if (usePoints) {
          await CustomerService.adjustPoints(
            customerId,
            15,
            'Hoàn điểm vòng quay',
            'Hoàn lại 15 điểm do voucher trúng thưởng không khả dụng',
            POINT_TRANSACTION_TYPE.ADJUSTMENT,
            { spentChange: 0, affectsCycle: false }
          );
        } else {
          customer.luckySpins = (customer.luckySpins || 0) + 1;
          await customer.save();
        }
        return { status: 400, success: false, message: 'Phần thưởng voucher trúng hiện không khả dụng' };
      }

      // Tạo CustomerVoucher lưu vào ví khách hàng
      const customerVoucher = await CustomerVoucher.create({
        customerId,
        voucherId: voucher._id,
        title: selectedPrize.label,
        expiryDate: voucher.endDate,
        source: 'CAMPAIGN'
      });

      rewardData = {
        voucherCode: voucher.code,
        voucherTitle: voucher.title,
        expiryDate: customerVoucher.expiryDate
      };
    } else if (selectedPrize.type === "LUCK" && selectedPrize.value > 0) {
      // Cộng thêm lượt quay miễn phí vào tài khoản khách hàng
      customer.luckySpins = (customer.luckySpins || 0) + selectedPrize.value;
      await customer.save();
      rewardData = {
        spinsEarned: selectedPrize.value,
        luckySpins: customer.luckySpins
      };
    }

    const updatedCustomer = await Customer.findById(customerId);

    return {
      status: 200,
      success: true,
      message: `Chúc mừng bạn đã quay trúng ${selectedPrize.label}`,
      data: {
        prizeId: selectedPrize.slotIndex,
        prizeName: selectedPrize.label,
        prizeLabel: selectedPrize.label,
        prizeType: selectedPrize.type,
        rewardData,
        currentPoints: updatedCustomer.currentPoints,
        luckySpins: updatedCustomer.luckySpins || 0
      }
    };
  }
}

module.exports = LuckyWheelService;
