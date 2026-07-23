const mongoose = require('mongoose');
const LuckyWheel = require('../models/luckyWheel.model');
const LuckyWheelSlot = require('../models/luckyWheelSlot.model');
const SpinHistory = require('../models/spinHistory.model');
const Voucher = require('../models/voucher.model');
const CustomerVoucher = require('../models/customerVoucher.model');
const CustomerSegment = require('../models/customerSegment.model');
const CustomerService = require('./customer.service');
const {
  LUCKY_WHEEL_STATUS,
  WHEEL_TARGET_TYPE,
  PRIZE_TYPE,
  CUSTOMER_VOUCHER_SOURCE,
  POINT_TRANSACTION_TYPE,
} = require('../enums');

class LuckyWheelService {
  // ── Validate danh sách ô giải thưởng: đủ dữ liệu + tổng tỉ lệ = 100% ──
  static async _validateSlots(slots) {
    if (!Array.isArray(slots) || slots.length === 0) {
      return { error: { status: 400, success: false, message: 'Vòng quay phải có ít nhất một ô giải thưởng' } };
    }

    let sum = 0;
    const voucherIds = [];
    for (const s of slots) {
      if (!s.label || !String(s.label).trim()) {
        return { error: { status: 400, success: false, message: 'Mỗi ô phải có nhãn hiển thị' } };
      }
      if (!Object.values(PRIZE_TYPE).includes(s.prizeType)) {
        return { error: { status: 400, success: false, message: `Loại phần thưởng không hợp lệ: ${s.prizeType}` } };
      }
      const prob = Number(s.probability);
      if (isNaN(prob) || prob < 0) {
        return { error: { status: 400, success: false, message: 'Tỉ lệ trúng phải là số không âm' } };
      }
      sum += prob;

      if (s.prizeType === PRIZE_TYPE.VOUCHER) {
        if (!s.voucherId) {
          return { error: { status: 400, success: false, message: `Ô "${s.label}" là phần thưởng voucher nhưng chưa chọn voucher` } };
        }
        voucherIds.push(s.voucherId);
      }
      if (s.prizeType === PRIZE_TYPE.POINTS && (!s.points || Number(s.points) <= 0)) {
        return { error: { status: 400, success: false, message: `Ô "${s.label}" là phần thưởng điểm nhưng số điểm không hợp lệ` } };
      }
    }

    // Cho phép sai số nhỏ do làm tròn
    if (Math.abs(sum - 100) > 0.01) {
      return { error: { status: 400, success: false, message: `Tổng tỉ lệ các ô phải bằng 100% (hiện tại: ${sum}%)` } };
    }

    if (voucherIds.length > 0) {
      const found = await Voucher.countDocuments({ _id: { $in: voucherIds } });
      if (found !== new Set(voucherIds.map(String)).size) {
        return { error: { status: 404, success: false, message: 'Một hoặc nhiều voucher của phần thưởng không tồn tại' } };
      }
    }

    return { ok: true };
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

  // ── CRUD ──
  static async createWheel(data, createdById) {
    if (!data.endDate) {
      return { status: 400, success: false, message: 'Ngày kết thúc là bắt buộc' };
    }
    if (data.startDate && new Date(data.startDate) >= new Date(data.endDate)) {
      return { status: 400, success: false, message: 'Ngày bắt đầu phải trước ngày kết thúc' };
    }

    const validation = await LuckyWheelService._validateSlots(data.slots);
    if (validation.error) return validation.error;

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

    return { status: 201, success: true, message: 'Tạo vòng quay thành công', data: await LuckyWheelService._detail(wheel._id) };
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
      status: 200,
      success: true,
      message: 'Lấy danh sách vòng quay thành công',
      data: wheels,
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
      return { status: 404, success: false, message: 'Không tìm thấy vòng quay' };
    }
    return { status: 200, success: true, message: 'Lấy chi tiết vòng quay thành công', data: wheel };
  }

  static async updateWheel(id, data) {
    const wheel = await LuckyWheel.findById(id);
    if (!wheel) {
      return { status: 404, success: false, message: 'Không tìm thấy vòng quay' };
    }
    if (wheel.status !== LUCKY_WHEEL_STATUS.DRAFT) {
      return { status: 400, success: false, message: 'Chỉ có thể chỉnh sửa vòng quay ở trạng thái nháp' };
    }

    if (data.slots !== undefined) {
      const validation = await LuckyWheelService._validateSlots(data.slots);
      if (validation.error) return validation.error;
    }

    const allowed = ['name', 'description', 'startDate', 'endDate', 'targetType', 'segmentIds', 'tierIds', 'spinLimitPerCustomer', 'spinCost'];
    for (const key of allowed) {
      if (data[key] !== undefined) wheel[key] = data[key];
    }
    await wheel.save();

    // Thay toàn bộ danh sách ô nếu client gửi lên
    if (data.slots !== undefined) {
      await LuckyWheelSlot.deleteMany({ wheelId: wheel._id });
      await LuckyWheelSlot.insertMany(LuckyWheelService._buildSlotDocs(wheel._id, data.slots));
    }

    return { status: 200, success: true, message: 'Cập nhật vòng quay thành công', data: await LuckyWheelService._detail(wheel._id) };
  }

  static async deleteWheel(id) {
    const wheel = await LuckyWheel.findById(id);
    if (!wheel) {
      return { status: 404, success: false, message: 'Không tìm thấy vòng quay' };
    }
    if (wheel.status !== LUCKY_WHEEL_STATUS.DRAFT) {
      return { status: 400, success: false, message: 'Chỉ có thể xóa vòng quay ở trạng thái nháp' };
    }
    await LuckyWheelSlot.deleteMany({ wheelId: wheel._id });
    await LuckyWheel.findByIdAndDelete(id);
    return { status: 200, success: true, message: 'Xóa vòng quay thành công' };
  }

  static async updateStatus(id, status) {
    const wheel = await LuckyWheel.findById(id);
    if (!wheel) {
      return { status: 404, success: false, message: 'Không tìm thấy vòng quay' };
    }

    if (status === LUCKY_WHEEL_STATUS.ACTIVE) {
      if (wheel.status !== LUCKY_WHEEL_STATUS.DRAFT) {
        return { status: 400, success: false, message: 'Chỉ có thể kích hoạt vòng quay ở trạng thái nháp' };
      }
      if (new Date(wheel.endDate) <= new Date()) {
        return { status: 400, success: false, message: 'Vòng quay đã quá ngày kết thúc, không thể kích hoạt' };
      }
      const slots = await LuckyWheelSlot.find({ wheelId: wheel._id });
      const validation = await LuckyWheelService._validateSlots(slots.map((s) => s.toObject()));
      if (validation.error) return validation.error;

      wheel.status = LUCKY_WHEEL_STATUS.ACTIVE;
      await wheel.save();
      return { status: 200, success: true, message: 'Kích hoạt vòng quay thành công', data: wheel };
    }

    if (status === LUCKY_WHEEL_STATUS.FINISHED) {
      if (wheel.status !== LUCKY_WHEEL_STATUS.ACTIVE) {
        return { status: 400, success: false, message: 'Chỉ có thể kết thúc vòng quay đang hoạt động' };
      }
      wheel.status = LUCKY_WHEEL_STATUS.FINISHED;
      await wheel.save();
      return { status: 200, success: true, message: 'Đã kết thúc vòng quay', data: wheel };
    }

    return { status: 400, success: false, message: 'Trạng thái không hợp lệ' };
  }

  // ── Khách hàng: kiểm tra thuộc phạm vi áp dụng ──
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

  // Vòng quay đang mở & hợp lệ cho khách hàng hiện tại
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
        return { status: 200, success: true, message: 'Lấy vòng quay hiện hành thành công', data };
      }
    }

    return { status: 404, success: false, message: 'Hiện không có vòng quay nào áp dụng cho bạn' };
  }

  // Chọn ngẫu nhiên có trọng số theo probability (đã tái phân bổ trên các ô khả dụng)
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

  // ── Khách hàng: thực hiện quay ──
  static async spin(wheelId, customer) {
    const wheel = await LuckyWheel.findById(wheelId);
    if (!wheel) {
      return { status: 404, success: false, message: 'Không tìm thấy vòng quay' };
    }
    if (wheel.status !== LUCKY_WHEEL_STATUS.ACTIVE) {
      return { status: 400, success: false, message: 'Vòng quay chưa mở hoặc đã kết thúc' };
    }
    const now = new Date();
    if ((wheel.startDate && wheel.startDate > now) || wheel.endDate < now) {
      return { status: 400, success: false, message: 'Vòng quay không nằm trong thời gian hoạt động' };
    }
    if (!(await LuckyWheelService._matchesTarget(wheel, customer))) {
      return { status: 403, success: false, message: 'Bạn không thuộc nhóm khách hàng được áp dụng vòng quay này' };
    }

    // Giới hạn lượt quay / khách
    const remaining = await LuckyWheelService._remainingSpins(wheel, customer._id);
    if (remaining <= 0) {
      return { status: 400, success: false, message: 'Bạn đã hết lượt quay cho vòng quay này' };
    }

    // Kiểm tra điểm nếu quay tốn phí
    if (wheel.spinCost > 0 && customer.currentPoints < wheel.spinCost) {
      return { status: 400, success: false, message: `Bạn cần ${wheel.spinCost} điểm để quay` };
    }

    // Chốt ô trúng: lọc kho thực tế -> weighted random -> trừ kho atomic (chống oversell)
    let chosen = null;
    let awardedVoucher = null;
    for (let attempt = 0; attempt < 6 && !chosen; attempt += 1) {
      const slots = await LuckyWheelSlot.find({ wheelId: wheel._id });

      // Nạp voucher để loại ô voucher đã hết kho
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

      if (candidates.length === 0) break; // hết quà

      const pick = LuckyWheelService._weightedPick(candidates);

      // Trừ kho ô (nếu có giới hạn)
      if (pick.stockLimit > 0) {
        const claimedSlot = await LuckyWheelSlot.findOneAndUpdate(
          { _id: pick._id, $expr: { $lt: ['$stockUsed', '$stockLimit'] } },
          { $inc: { stockUsed: 1 } },
          { new: true }
        );
        if (!claimedSlot) continue; // race: ô vừa hết -> quay lại
      }

      // Trừ kho voucher (nếu là phần thưởng voucher)
      if (pick.prizeType === PRIZE_TYPE.VOUCHER) {
        const claimedVoucher = await Voucher.findOneAndUpdate(
          { _id: pick.voucherId, isActive: 'active', $expr: { $lt: ['$issuedCount', '$usageLimit'] } },
          { $inc: { issuedCount: 1 } },
          { new: true }
        );
        if (!claimedVoucher) {
          // Hoàn kho ô đã trừ rồi thử lại
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
      return { status: 400, success: false, message: 'Quà đã hết, vui lòng thử lại sau' };
    }

    // Trừ điểm phí quay (nếu có). Thất bại -> hoàn lại kho ô & voucher.
    if (wheel.spinCost > 0) {
      const payRes = await CustomerService.adjustPoints(
        customer._id,
        -wheel.spinCost,
        `Phí quay: ${wheel.name}`,
        'Trừ điểm cho 1 lượt quay may mắn',
        POINT_TRANSACTION_TYPE.LUCKY_WHEEL
      );
      if (!payRes.success) {
        if (chosen.stockLimit > 0) await LuckyWheelSlot.updateOne({ _id: chosen._id }, { $inc: { stockUsed: -1 } });
        if (awardedVoucher) await Voucher.updateOne({ _id: awardedVoucher._id }, { $inc: { issuedCount: -1 } });
        return payRes;
      }
    }

    // Phát thưởng
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

    // Ghi nhật ký trúng thưởng
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
      status: 200,
      success: true,
      message: chosen.prizeType === PRIZE_TYPE.NONE ? 'Chúc bạn may mắn lần sau!' : 'Chúc mừng bạn đã trúng thưởng!',
      data: {
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
      },
    };
  }

  // ── Lịch sử quay của khách hàng hiện tại ──
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
      status: 200,
      success: true,
      message: 'Lấy lịch sử quay thành công',
      data: spins,
      pagination: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / limit) },
    };
  }

  // ── Admin: log toàn bộ người trúng của 1 vòng quay ──
  static async getWheelSpins(wheelId, query = {}) {
    if (!mongoose.Types.ObjectId.isValid(wheelId)) {
      return { status: 400, success: false, message: 'ID vòng quay không hợp lệ' };
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
      status: 200,
      success: true,
      message: 'Lấy lịch sử trúng thưởng thành công',
      data: spins,
      pagination: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / limit) },
    };
  }
}

module.exports = LuckyWheelService;
