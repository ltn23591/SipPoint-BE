const mongoose = require('mongoose');
const LuckyWheel = require('../models/luckyWheel.model');
const LuckyWheelSlot = require('../models/luckyWheelSlot.model');
const SpinHistory = require('../models/spinHistory.model');
const Voucher = require('../models/voucher.model');
const CustomerVoucher = require('../models/customerVoucher.model');
const CustomerSegment = require('../models/customerSegment.model');
const CustomerService = require('./customer.service');
const AppError = require('../utils/AppError');
const {
  LUCKY_WHEEL_STATUS,
  WHEEL_TARGET_TYPE,
  PRIZE_TYPE,
  CUSTOMER_VOUCHER_SOURCE,
  POINT_TRANSACTION_TYPE,
} = require('../enums');

class LuckyWheelService {
  static async _validateSlots(slots) {
    if (!Array.isArray(slots) || slots.length === 0) {
      throw new AppError('Vòng quay phải có ít nhất một ô giải thưởng', 400);
    }

    let sum = 0;
    const voucherIds = [];
    for (const s of slots) {
      if (!s.label || !String(s.label).trim()) {
        throw new AppError('Mỗi ô phải có nhãn hiển thị', 400);
      }
      if (!Object.values(PRIZE_TYPE).includes(s.prizeType)) {
        throw new AppError(`Loại phần thưởng không hợp lệ: ${s.prizeType}`, 400);
      }
      const prob = Number(s.probability);
      if (isNaN(prob) || prob < 0) {
        throw new AppError('Tỉ lệ trúng phải là số không âm', 400);
      }
      sum += prob;

      if (s.prizeType === PRIZE_TYPE.VOUCHER) {
        if (!s.voucherId) {
          throw new AppError(`Ô "${s.label}" là phần thưởng voucher nhưng chưa chọn voucher`, 400);
        }
        voucherIds.push(s.voucherId);
      }
      if (s.prizeType === PRIZE_TYPE.POINTS && (!s.points || Number(s.points) <= 0)) {
        throw new AppError(`Ô "${s.label}" là phần thưởng điểm nhưng số điểm không hợp lệ`, 400);
      }
    }

    if (Math.abs(sum - 100) > 0.01) {
      throw new AppError(`Tổng tỉ lệ các ô phải bằng 100% (hiện tại: ${sum}%)`, 400);
    }

    if (voucherIds.length > 0) {
      const found = await Voucher.countDocuments({ _id: { $in: voucherIds } });
      if (found !== new Set(voucherIds.map(String)).size) {
        throw new AppError('Một hoặc nhiều voucher của phần thưởng không tồn tại', 404);
      }
    }

    return true;
  }

  static _buildSlotDocs(wheelId, slots) {
    return slots.map((s) => ({
      wheelId,
      label: s.label,
      color: s.color,
      prizeType: s.prizeType,
      voucherId: s.prizeType === PRIZE_TYPE.VOUCHER ? s.voucherId : undefined,
      points: s.prizeType === PRIZE_TYPE.POINTS ? Number(s.points) : 0,
      probability: Number(s.probability),
      stockLimit: s.stockLimit !== undefined ? Number(s.stockLimit) : 0,
      stockUsed: 0,
    }));
  }

  static async createWheel(data, createdById) {
    if (!data.endDate) {
      throw new AppError('Ngày kết thúc là bắt buộc', 400);
    }
    if (data.startDate && new Date(data.startDate) >= new Date(data.endDate)) {
      throw new AppError('Ngày bắt đầu phải trước ngày kết thúc', 400);
    }

    await LuckyWheelService._validateSlots(data.slots);

    const wheel = await LuckyWheel.create({
      name: data.name,
      description: data.description,
      startDate: data.startDate,
      endDate: data.endDate,
      targetType: data.targetType || WHEEL_TARGET_TYPE.ALL,
      segmentIds: data.targetType === WHEEL_TARGET_TYPE.SEGMENT ? data.segmentIds || [] : [],
      tierIds: data.targetType === WHEEL_TARGET_TYPE.TIER ? data.tierIds || [] : [],
      spinLimitPerCustomer: data.spinLimitPerCustomer !== undefined ? data.spinLimitPerCustomer : 1,
      spinCost: data.spinCost || 0,
      createdBy: createdById || undefined,
    });

    await LuckyWheelSlot.insertMany(LuckyWheelService._buildSlotDocs(wheel._id, data.slots));

    return await LuckyWheelService._detail(wheel._id);
  }

  static async getAllWheels(query = {}) {
    const { page = 1, limit = 10, status, search } = query;
    const skip = (page - 1) * limit;

    const filter = {};
    if (status) filter.status = status;
    if (search) filter.name = { $regex: search, $options: 'i' };

    const wheels = await LuckyWheel.find(filter)
      .populate('slots')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await LuckyWheel.countDocuments(filter);

    return {
      wheels,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async _detail(id) {
    return LuckyWheel.findById(id)
      .populate({ path: 'slots', populate: { path: 'voucherId', select: 'code title discountType discountValue' } })
      .populate('segmentIds', 'name memberCount')
      .populate('tierIds', 'name')
      .populate('createdBy', 'name email');
  }

  static async getWheelById(id) {
    const wheel = await LuckyWheelService._detail(id);
    if (!wheel) {
      throw new AppError('Không tìm thấy vòng quay', 404);
    }
    return wheel;
  }

  static async updateWheel(id, data) {
    const wheel = await LuckyWheel.findById(id);
    if (!wheel) {
      throw new AppError('Không tìm thấy vòng quay', 404);
    }
    if (wheel.status !== LUCKY_WHEEL_STATUS.DRAFT) {
      throw new AppError('Chỉ có thể chỉnh sửa vòng quay ở trạng thái nháp', 400);
    }

    if (data.slots !== undefined) {
      await LuckyWheelService._validateSlots(data.slots);
    }

    const allowed = ['name', 'description', 'startDate', 'endDate', 'targetType', 'segmentIds', 'tierIds', 'spinLimitPerCustomer', 'spinCost'];
    for (const key of allowed) {
      if (data[key] !== undefined) wheel[key] = data[key];
    }
    await wheel.save();

    if (data.slots !== undefined) {
      await LuckyWheelSlot.deleteMany({ wheelId: wheel._id });
      await LuckyWheelSlot.insertMany(LuckyWheelService._buildSlotDocs(wheel._id, data.slots));
    }

    return await LuckyWheelService._detail(wheel._id);
  }

  static async deleteWheel(id) {
    const wheel = await LuckyWheel.findById(id);
    if (!wheel) {
      throw new AppError('Không tìm thấy vòng quay', 404);
    }
    if (wheel.status !== LUCKY_WHEEL_STATUS.DRAFT) {
      throw new AppError('Chỉ có thể xóa vòng quay ở trạng thái nháp', 400);
    }
    await LuckyWheelSlot.deleteMany({ wheelId: wheel._id });
    await LuckyWheel.findByIdAndDelete(id);
    return {};
  }

  static async updateStatus(id, status) {
    const wheel = await LuckyWheel.findById(id);
    if (!wheel) {
      throw new AppError('Không tìm thấy vòng quay', 404);
    }

    if (status === LUCKY_WHEEL_STATUS.ACTIVE) {
      if (wheel.status !== LUCKY_WHEEL_STATUS.DRAFT) {
        throw new AppError('Chỉ có thể kích hoạt vòng quay ở trạng thái nháp', 400);
      }
      if (new Date(wheel.endDate) <= new Date()) {
        throw new AppError('Vòng quay đã quá ngày kết thúc, không thể kích hoạt', 400);
      }
      const slots = await LuckyWheelSlot.find({ wheelId: wheel._id });
      await LuckyWheelService._validateSlots(slots.map((s) => s.toObject()));

      wheel.status = LUCKY_WHEEL_STATUS.ACTIVE;
      await wheel.save();
      return wheel;
    }

    if (status === LUCKY_WHEEL_STATUS.FINISHED) {
      if (wheel.status !== LUCKY_WHEEL_STATUS.ACTIVE) {
        throw new AppError('Chỉ có thể kết thúc vòng quay đang hoạt động', 400);
      }
      wheel.status = LUCKY_WHEEL_STATUS.FINISHED;
      await wheel.save();
      return wheel;
    }

    throw new AppError('Trạng thái không hợp lệ', 400);
  }

  static async _matchesTarget(wheel, customer) {
    if (wheel.targetType === WHEEL_TARGET_TYPE.ALL) return true;
    if (wheel.targetType === WHEEL_TARGET_TYPE.TIER) {
      if (!customer.tierId) return false;
      const tierId = customer.tierId._id ? customer.tierId._id : customer.tierId;
      return (wheel.tierIds || []).some((t) => String(t) === String(tierId));
    }
    if (wheel.targetType === WHEEL_TARGET_TYPE.SEGMENT) {
      const inSegment = await CustomerSegment.exists({
        _id: { $in: wheel.segmentIds || [] },
        memberIds: customer._id,
      });
      return !!inSegment;
    }
    return false;
  }

  static async _remainingSpins(wheel, customerId) {
    if (!wheel.spinLimitPerCustomer || wheel.spinLimitPerCustomer <= 0) return Infinity;
    const used = await SpinHistory.countDocuments({ wheelId: wheel._id, customerId });
    return Math.max(0, wheel.spinLimitPerCustomer - used);
  }

  static async getActiveWheelForCustomer(customer) {
    const now = new Date();
    const wheels = await LuckyWheel.find({
      status: LUCKY_WHEEL_STATUS.ACTIVE,
      endDate: { $gte: now },
      $or: [{ startDate: { $lte: now } }, { startDate: null }, { startDate: { $exists: false } }],
    })
      .populate('slots')
      .sort({ createdAt: -1 });

    for (const wheel of wheels) {
      if (await LuckyWheelService._matchesTarget(wheel, customer)) {
        const remaining = await LuckyWheelService._remainingSpins(wheel, customer._id);
        const data = wheel.toObject();
        data.remainingSpins = remaining === Infinity ? null : remaining;
        return data;
      }
    }

    throw new AppError('Hiện không có vòng quay nào áp dụng cho bạn', 404);
  }

  static _weightedPick(slots) {
    const total = slots.reduce((sum, s) => sum + (s.probability || 0), 0);
    if (total <= 0) {
      return slots[Math.floor(Math.random() * slots.length)];
    }
    let r = Math.random() * total;
    for (const s of slots) {
      r -= s.probability || 0;
      if (r <= 0) return s;
    }
    return slots[slots.length - 1];
  }

  static async spin(wheelId, customer) {
    const wheel = await LuckyWheel.findById(wheelId);
    if (!wheel) {
      throw new AppError('Không tìm thấy vòng quay', 404);
    }
    if (wheel.status !== LUCKY_WHEEL_STATUS.ACTIVE) {
      throw new AppError('Vòng quay chưa mở hoặc đã kết thúc', 400);
    }
    const now = new Date();
    if ((wheel.startDate && wheel.startDate > now) || wheel.endDate < now) {
      throw new AppError('Vòng quay không nằm trong thời gian hoạt động', 400);
    }
    if (!(await LuckyWheelService._matchesTarget(wheel, customer))) {
      throw new AppError('Bạn không thuộc nhóm khách hàng được áp dụng vòng quay này', 403);
    }

    const remaining = await LuckyWheelService._remainingSpins(wheel, customer._id);
    if (remaining <= 0) {
      throw new AppError('Bạn đã hết lượt quay cho vòng quay này', 400);
    }

    if (wheel.spinCost > 0 && customer.currentPoints < wheel.spinCost) {
      throw new AppError(`Bạn cần ${wheel.spinCost} điểm để quay`, 400);
    }

    let chosen = null;
    let awardedVoucher = null;
    for (let attempt = 0; attempt < 6 && !chosen; attempt += 1) {
      const slots = await LuckyWheelSlot.find({ wheelId: wheel._id });

      const voucherIds = slots.filter((s) => s.prizeType === PRIZE_TYPE.VOUCHER && s.voucherId).map((s) => s.voucherId);
      const vouchers = voucherIds.length ? await Voucher.find({ _id: { $in: voucherIds } }) : [];
      const vMap = new Map(vouchers.map((v) => [String(v._id), v]));

      const candidates = slots.filter((s) => {
        const stockOk = s.stockLimit === 0 || s.stockUsed < s.stockLimit;
        if (!stockOk) return false;
        if (s.prizeType === PRIZE_TYPE.VOUCHER) {
          const v = vMap.get(String(s.voucherId));
          if (!v || v.isActive !== 'active' || v.issuedCount >= v.usageLimit) return false;
        }
        return true;
      });

      if (candidates.length === 0) break;

      const pick = LuckyWheelService._weightedPick(candidates);

      if (pick.stockLimit > 0) {
        const claimedSlot = await LuckyWheelSlot.findOneAndUpdate(
          { _id: pick._id, $expr: { $lt: ['$stockUsed', '$stockLimit'] } },
          { $inc: { stockUsed: 1 } },
          { new: true }
        );
        if (!claimedSlot) continue;
      }

      if (pick.prizeType === PRIZE_TYPE.VOUCHER) {
        const claimedVoucher = await Voucher.findOneAndUpdate(
          { _id: pick.voucherId, isActive: 'active', $expr: { $lt: ['$issuedCount', '$usageLimit'] } },
          { $inc: { issuedCount: 1 } },
          { new: true }
        );
        if (!claimedVoucher) {
          if (pick.stockLimit > 0) {
            await LuckyWheelSlot.updateOne({ _id: pick._id }, { $inc: { stockUsed: -1 } });
          }
          continue;
        }
        awardedVoucher = claimedVoucher;
      }

      chosen = pick;
    }

    if (!chosen) {
      throw new AppError('Quà đã hết, vui lòng thử lại sau', 400);
    }

    if (wheel.spinCost > 0) {
      try {
        await CustomerService.adjustPoints(
          customer._id,
          -wheel.spinCost,
          `Phí quay: ${wheel.name}`,
          'Trừ điểm cho 1 lượt quay may mắn',
          POINT_TRANSACTION_TYPE.LUCKY_WHEEL
        );
      } catch (err) {
        if (chosen.stockLimit > 0) await LuckyWheelSlot.updateOne({ _id: chosen._id }, { $inc: { stockUsed: -1 } });
        if (awardedVoucher) await Voucher.updateOne({ _id: awardedVoucher._id }, { $inc: { issuedCount: -1 } });
        throw err;
      }
    }

    let customerVoucherId = null;
    let awardedPoints = 0;
    if (chosen.prizeType === PRIZE_TYPE.VOUCHER && awardedVoucher) {
      const expiryDate = new Date(
        Math.min(new Date(awardedVoucher.endDate).getTime(), new Date(wheel.endDate).getTime())
      );
      const cv = await CustomerVoucher.create({
        customerId: customer._id,
        voucherId: awardedVoucher._id,
        title: awardedVoucher.title,
        expiryDate,
        source: CUSTOMER_VOUCHER_SOURCE.LUCKY_WHEEL,
      });
      customerVoucherId = cv._id;
    } else if (chosen.prizeType === PRIZE_TYPE.POINTS && chosen.points > 0) {
      await CustomerService.adjustPoints(
        customer._id,
        chosen.points,
        `Trúng thưởng: ${wheel.name}`,
        `Vòng quay may mắn - ${chosen.label}`,
        POINT_TRANSACTION_TYPE.LUCKY_WHEEL
      );
      awardedPoints = chosen.points;
    }

    const spin = await SpinHistory.create({
      wheelId: wheel._id,
      customerId: customer._id,
      slotId: chosen._id,
      prizeType: chosen.prizeType,
      prizeLabel: chosen.label,
      voucherId: awardedVoucher ? awardedVoucher._id : undefined,
      customerVoucherId: customerVoucherId || undefined,
      points: awardedPoints,
      spunAt: new Date(),
    });

    return {
      message: chosen.prizeType === PRIZE_TYPE.NONE ? 'Chúc bạn may mắn lần sau!' : 'Chúc mừng bạn đã trúng thưởng!',
      prize: {
        slotId: chosen._id,
        type: chosen.prizeType,
        label: chosen.label,
        color: chosen.color,
        points: awardedPoints,
        voucherId: awardedVoucher ? awardedVoucher._id : null,
        customerVoucherId,
      },
      spinId: spin._id,
      remainingSpins: remaining === Infinity ? null : remaining - 1,
    };
  }

  static async getMySpins(customerId, query = {}) {
    const { page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const spins = await SpinHistory.find({ customerId })
      .populate('wheelId', 'name')
      .sort({ spunAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    const total = await SpinHistory.countDocuments({ customerId });

    return {
      spins,
      pagination: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / limit) },
    };
  }

  static async getWheelSpins(wheelId, query = {}) {
    if (!mongoose.Types.ObjectId.isValid(wheelId)) {
      throw new AppError('ID vòng quay không hợp lệ', 400);
    }
    const { page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const spins = await SpinHistory.find({ wheelId })
      .populate('customerId', 'fullName phone')
      .sort({ spunAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    const total = await SpinHistory.countDocuments({ wheelId });

    return {
      spins,
      pagination: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / limit) },
    };
  }
}

module.exports = LuckyWheelService;
