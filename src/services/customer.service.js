const Customer = require('../models/customer.model');
const PointHistory = require('../models/pointHistory.model');
const CustomerVoucher = require('../models/customerVoucher.model');
const MembershipTier = require('../models/membershipTier.model');
const { POINT_TRANSACTION_TYPE, TIER_CYCLE_MONTHS } = require('../enums');

class CustomerService {
  // Lấy danh sách khách hàng (có phân trang và lọc)
  static async getAllCustomers(query) {
    const { page = 1, limit = 10, tierId, search } = query;
    const skip = (page - 1) * limit;

    const filter = {};
    if (tierId) filter.tierId = tierId;
    if (search) {
      filter.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    const customers = await Customer.find(filter)
      .populate('tierId')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Customer.countDocuments(filter);

    return {
      status: 200,
      success: true,
      message: 'Lấy danh sách khách hàng thành công',
      data: customers,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Lấy chi tiết khách hàng (kèm lịch sử điểm và voucher)
  static async getCustomerById(id) {
    const customer = await Customer.findById(id).populate('tierId');
    if (!customer) {
      return { status: 404, success: false, message: 'Không tìm thấy khách hàng' };
    }

    const pointHistories = await PointHistory.find({ customerId: id })
      .sort({ createdAt: -1 })
      .limit(10);
    const vouchers = await CustomerVoucher.find({ customerId: id, isUsed: false });

    return {
      status: 200,
      success: true,
      message: 'Lấy thông tin chi tiết khách hàng thành công',
      data: {
        customer,
        pointHistories,
        vouchers,
      },
    };
  }

  // Khách hàng tự lấy lịch sử điểm của mình
  static async getMyPointHistory(customerId) {
    const pointHistories = await PointHistory.find({ customerId })
      .sort({ createdAt: -1 })
      .limit(20);

    return {
      status: 200,
      success: true,
      message: 'Lấy lịch sử điểm thành công',
      data: pointHistories,
    };
  }

  // Thêm mới khách hàng
  static async createCustomer(data) {
    const existing = await Customer.findOne({ phone: data.phone });
    if (existing) {
      return { status: 400, success: false, message: 'Số điện thoại đã tồn tại' };
    }

    // Tự động gán hạng thấp nhất của MembershipTier
    if (!data.tierId) {
      const lowestTier = await MembershipTier.findOne({ status: 'active' }).sort({ minPoints: 1 });
      if (lowestTier) {
        data.tierId = lowestTier._id;
      }
    }

    const newCustomer = await Customer.create(data);
    const populated = await Customer.findById(newCustomer._id).populate('tierId');
    return { status: 201, success: true, message: 'Thêm khách hàng thành công', data: populated };
  }

  // Cập nhật thông tin khách hàng
  static async updateCustomer(id, data) {
    const updatedCustomer = await Customer.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    }).populate('tierId');

    if (!updatedCustomer) {
      return { status: 404, success: false, message: 'Không tìm thấy khách hàng' };
    }

    return { status: 200, success: true, message: 'Cập nhật thành công', data: updatedCustomer };
  }

  // Khách hàng tự cập nhật thông tin cá nhân
  static async updateMyProfile(id, data) {
    const { fullName, phone, email, dateOfBirth, avatar } = data;
    const updateData = {};
    if (fullName !== undefined) updateData.fullName = fullName;
    if (phone !== undefined) updateData.phone = phone;
    if (email !== undefined) updateData.email = email;
    if (dateOfBirth !== undefined) updateData.dateOfBirth = dateOfBirth;
    if (avatar !== undefined) updateData.avatar = avatar;

    const updatedCustomer = await Customer.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select('-password').populate('tierId');

    if (!updatedCustomer) {
      return { status: 404, success: false, message: 'Không tìm thấy khách hàng' };
    }

    return { status: 200, success: true, message: 'Cập nhật thông tin thành công', data: updatedCustomer };
  }

  // Lấy danh sách voucher của khách hàng
  static async getMyVouchers(customerId) {
    const vouchers = await CustomerVoucher.find({ customerId })
      .populate('voucherId')
      .sort({ isUsed: 1, expiryDate: 1 });

    return {
      status: 200,
      success: true,
      message: 'Lấy danh sách voucher thành công',
      data: vouchers,
    };
  }

  // Cộng / Trừ điểm khách hàng
  // opts.spentChange: delta totalSpent tường minh (đơn hàng truyền order.total, đổi quà truyền 0, refund truyền -order.total)
  // opts.affectsCycle: true với giao dịch ORDER/REFUND - cộng/trừ cyclePoints và xét thăng hạng cuốn chiếu
  // opts.orderId: gắn giao dịch điểm với đơn hàng
  static async adjustPoints(id, pointsChange, title, description, transactionType, opts = {}) {
    const customer = await Customer.findById(id);
    if (!customer) {
      return { status: 404, success: false, message: 'Không tìm thấy khách hàng' };
    }

    const change = Number(pointsChange);
    if (isNaN(change)) {
      return { status: 400, success: false, message: 'Số điểm thay đổi không hợp lệ' };
    }

    if (change < 0 && customer.currentPoints + change < 0) {
      return {
        status: 400,
        success: false,
        message: 'Số điểm trừ vượt quá số điểm tích lũy hiện có của khách hàng',
      };
    }

    customer.currentPoints += change;

    if (opts.spentChange !== undefined) {
      customer.totalSpent = Math.max(0, customer.totalSpent + Number(opts.spentChange));
    } else if (change > 0 && transactionType === POINT_TRANSACTION_TYPE.ADJUSTMENT) {
      // Giữ hành vi cũ cho endpoint admin điều chỉnh điểm thủ công
      customer.totalSpent += change * 1000; // Giả sử 1 điểm = 1000đ chi tiêu
    }

    if (opts.affectsCycle) {
      customer.cyclePoints = Math.max(0, customer.cyclePoints + change);
      await CustomerService.applyTierProgress(customer);
    }

    await customer.save();

    // Ghi lại lịch sử
    await PointHistory.create({
      customerId: id,
      title,
      description,
      pointsChange: change,
      transactionType,
      orderId: opts.orderId || undefined,
    });

    const updatedCustomer = await Customer.findById(customer._id).populate('tierId');

    return { status: 200, success: true, message: 'Điều chỉnh điểm thành công', data: updatedCustomer };
  }

  // Xét thăng hạng theo cơ chế cuốn chiếu: cyclePoints chạm ngưỡng tier cao hơn
  // => lên hạng ngay, khởi động đồng hồ 12 tháng mới và reset cyclePoints.
  // Không tự hạ hạng ở đây - hạ hạng chỉ xảy ra khi hết chu kỳ (processTierExpirations).
  // Lưu ý: hàm này chỉ mutate customer, KHÔNG save - caller chịu trách nhiệm save.
  static async applyTierProgress(customer) {
    const tiers = await MembershipTier.find({ status: 'active' }).sort({ minPoints: 1 });
    if (tiers.length === 0) return;

    // Khởi tạo chu kỳ cho khách chưa có (dữ liệu cũ trước khi có cơ chế cuốn chiếu)
    if (!customer.tierExpiresAt) {
      customer.tierAchievedAt = new Date();
      customer.tierExpiresAt = CustomerService.addMonths(new Date(), TIER_CYCLE_MONTHS);
    }
    if (!customer.tierId) {
      customer.tierId = tiers[0]._id;
    }

    const currentTier = tiers.find((t) => t._id.equals(customer.tierId));
    const currentMin = currentTier ? currentTier.minPoints : 0;

    // Tier cao hơn tier hiện tại mà cyclePoints đã chạm ngưỡng (lấy cao nhất)
    const promoted = [...tiers]
      .reverse()
      .find((t) => t.minPoints > currentMin && customer.cyclePoints >= t.minPoints);

    if (promoted) {
      customer.tierId = promoted._id;
      customer.tierAchievedAt = new Date();
      customer.tierExpiresAt = CustomerService.addMonths(new Date(), TIER_CYCLE_MONTHS);
      customer.cyclePoints = 0;
    }
  }

  // Chạy bởi cron 00:00 hằng ngày: xử lý các khách đã hết chu kỳ 12 tháng.
  // Đủ điểm duy trì (cyclePoints >= minPoints của tier hiện tại) => giữ hạng, reset chu kỳ.
  // Không đủ => hạ về tier cao nhất có minPoints <= cyclePoints, reset chu kỳ.
  static async processTierExpirations() {
    const now = new Date();
    const tiers = await MembershipTier.find({ status: 'active' }).sort({ minPoints: 1 });
    if (tiers.length === 0) return { processed: 0 };

    const expiredCustomers = await Customer.find({ tierExpiresAt: { $lt: now } });
    let processed = 0;

    for (const customer of expiredCustomers) {
      const currentTier = tiers.find((t) => t._id.equals(customer.tierId));
      const currentMin = currentTier ? currentTier.minPoints : 0;
      const retained = customer.cyclePoints >= currentMin;

      if (!retained) {
        // Hạ về tier cao nhất tương ứng số điểm tích được trong chu kỳ
        const matched = [...tiers].reverse().find((t) => customer.cyclePoints >= t.minPoints) || tiers[0];
        if (!matched._id.equals(customer.tierId)) {
          const oldTierName = currentTier ? currentTier.name : 'N/A';
          customer.tierId = matched._id;
          await PointHistory.create({
            customerId: customer._id,
            title: 'Điều chỉnh hạng thành viên',
            description: `Hết chu kỳ ${TIER_CYCLE_MONTHS} tháng, không đủ điểm duy trì hạng ${oldTierName}. Chuyển về hạng ${matched.name}.`,
            pointsChange: 0,
            transactionType: POINT_TRANSACTION_TYPE.ADJUSTMENT,
          });
        }
      }

      customer.tierAchievedAt = now;
      customer.tierExpiresAt = CustomerService.addMonths(now, TIER_CYCLE_MONTHS);
      customer.cyclePoints = 0;
      await customer.save();
      processed += 1;
    }

    return { processed };
  }

  static addMonths(date, months) {
    const result = new Date(date);
    result.setMonth(result.getMonth() + months);
    return result;
  }
}

module.exports = CustomerService;
