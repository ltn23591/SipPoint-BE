const CustomerSegment = require('../models/customerSegment.model');
const Customer = require('../models/customer.model');
const Campaign = require('../models/campaign.model');
const CampaignService = require('./campaign.service');
const { IS_ACTIVE, SEGMENT_MODE } = require('../enums');
const AppError = require('../utils/AppError');

const CUSTOMER_SELECT = 'fullName phone email gender currentPoints orderCount redeemCount tierId dateOfBirth lastVisitAt';

const dateYearsAgo = (years) => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - Number(years));
  return d;
};

const dateDaysAgo = (days) => {
  const d = new Date();
  d.setDate(d.getDate() - Number(days));
  return d;
};

const numFilter = (field, operator, value) => {
  switch (operator) {
    case 'eq':
      return { [field]: Number(value) };
    case 'gt':
      return { [field]: { $gt: Number(value) } };
    case 'lt':
      return { [field]: { $lt: Number(value) } };
    case 'between': {
      const [min, max] = Array.isArray(value) ? value : [value?.min, value?.max];
      return { [field]: { $gte: Number(min), $lte: Number(max) } };
    }
    default:
      return null;
  }
};

const ageFilter = (operator, value) => {
  switch (operator) {
    case 'eq': {
      const n = Number(value);
      return { dateOfBirth: { $ne: null, $gt: dateYearsAgo(n + 1), $lte: dateYearsAgo(n) } };
    }
    case 'gt':
      return { dateOfBirth: { $ne: null, $lte: dateYearsAgo(Number(value) + 1) } };
    case 'lt':
      return { dateOfBirth: { $ne: null, $gt: dateYearsAgo(Number(value)) } };
    case 'between': {
      const [min, max] = Array.isArray(value) ? value : [value?.min, value?.max];
      return { dateOfBirth: { $ne: null, $gt: dateYearsAgo(Number(max) + 1), $lte: dateYearsAgo(Number(min)) } };
    }
    default:
      return null;
  }
};

// Lọc theo SỐ NGÀY kể từ lần ghé gần nhất (lastVisitAt). Cùng quy ước làm tròn xuống như ageFilter:
// - gt 30  => đã hơn 30 ngày không quay lại (nhóm win-back)
// - lt 7   => có ghé trong vòng 7 ngày gần đây (nhóm đang hoạt động)
// Khách chưa từng ghé (lastVisitAt = null) KHÔNG thuộc các nhóm này - dùng tiêu chí
// "Số lần order = 0" nếu muốn nhắm tới nhóm chưa từng mua.
const lastVisitFilter = (operator, value) => {
  switch (operator) {
    case 'eq': {
      const n = Number(value);
      return { lastVisitAt: { $ne: null, $gt: dateDaysAgo(n + 1), $lte: dateDaysAgo(n) } };
    }
    case 'gt':
      return { lastVisitAt: { $ne: null, $lte: dateDaysAgo(Number(value) + 1) } };
    case 'lt':
      return { lastVisitAt: { $ne: null, $gt: dateDaysAgo(Number(value)) } };
    case 'between': {
      const [min, max] = Array.isArray(value) ? value : [value?.min, value?.max];
      return { lastVisitAt: { $ne: null, $gt: dateDaysAgo(Number(max) + 1), $lte: dateDaysAgo(Number(min)) } };
    }
    default:
      return null;
  }
};

class CustomerSegmentService {
  static buildCondition(cond) {
    if (!cond || !cond.field) return null;
    const { field, operator, value } = cond;

    switch (field) {
      case 'gender':
        if (!value) return null;
        return operator === 'ne' ? { gender: { $ne: value } } : { gender: value };

      case 'age':
        return ageFilter(operator, value);

      case 'birthdayMonth': {
        const months = (Array.isArray(value) ? value : [value]).map(Number).filter((m) => m >= 1 && m <= 12);
        if (months.length === 0) return null;
        if (operator === 'notIn') {
          return { dateOfBirth: { $ne: null }, $expr: { $not: { $in: [{ $month: '$dateOfBirth' }, months] } } };
        }
        return { dateOfBirth: { $ne: null }, $expr: { $in: [{ $month: '$dateOfBirth' }, months] } };
      }

      case 'points':
        return numFilter('currentPoints', operator, value);
      case 'redeemCount':
        return numFilter('redeemCount', operator, value);
      case 'orderCount':
        return numFilter('orderCount', operator, value);
      // Tổng chi tiêu tích lũy (đ) - mở khóa nhóm khách VIP
      case 'totalSpent':
        return numFilter('totalSpent', operator, value);
      // Số ngày kể từ lần ghé gần nhất - mở khóa nhóm win-back
      case 'lastVisitAt':
        return lastVisitFilter(operator, value);

      case 'hasEmail': {
        const want = value === true || value === 'true' || value === 'yes';
        return want
          ? { email: { $nin: [null, ''] } }
          : { $or: [{ email: null }, { email: '' }, { email: { $exists: false } }] };
      }
      case 'hasPhone': {
        const want = value === true || value === 'true' || value === 'yes';
        return want
          ? { phone: { $nin: [null, ''] } }
          : { $or: [{ phone: null }, { phone: '' }, { phone: { $exists: false } }] };
      }

      case 'tier': {
        const ids = (Array.isArray(value) ? value : [value]).filter(Boolean);
        if (ids.length === 0) return null;
        return operator === 'notIn' ? { tierId: { $nin: ids } } : { tierId: { $in: ids } };
      }

      default:
        return null;
    }
  }

  static buildGroup(group) {
    const conds = (group?.conditions || [])
      .map((c) => CustomerSegmentService.buildCondition(c))
      .filter(Boolean);
    if (conds.length === 0) return null;
    return { $and: conds };
  }

  static buildFilter(criteria = {}) {
    const groups = (criteria.groups || [])
      .map((g) => CustomerSegmentService.buildGroup(g))
      .filter(Boolean);

    if (groups.length === 0) {
      return { filter: { isActive: true }, hasCriteria: false };
    }
    return { filter: { isActive: true, $or: groups }, hasCriteria: true };
  }

  static async resolveMembers(data) {
    if (data.mode === SEGMENT_MODE.MANUAL) {
      const provided = (data.memberIds || []).filter(Boolean);
      if (provided.length === 0) {
        throw new AppError('Nhóm thủ công phải chọn ít nhất một khách hàng', 400);
      }
      const memberIds = await Customer.find({ _id: { $in: provided }, isActive: true }).distinct('_id');
      return { memberIds };
    }

    const { filter, hasCriteria } = CustomerSegmentService.buildFilter(data.criteria);
    if (!hasCriteria) {
      throw new AppError('Phải thiết lập ít nhất một tiêu chí lọc', 400);
    }
    const memberIds = await Customer.find(filter).distinct('_id');
    return { memberIds };
  }

  static async createSegment(data, createdById) {
    const existing = await CustomerSegment.findOne({ name: data.name });
    if (existing) {
      throw new AppError('Tên nhóm khách hàng đã tồn tại', 400);
    }

    const mode = data.mode === SEGMENT_MODE.MANUAL ? SEGMENT_MODE.MANUAL : SEGMENT_MODE.AUTO;
    const resolved = await CustomerSegmentService.resolveMembers({ ...data, mode });

    const segment = await CustomerSegment.create({
      name: data.name,
      description: data.description,
      mode,
      isRealtimeUpdate: mode === SEGMENT_MODE.AUTO ? !!data.isRealtimeUpdate : false,
      criteria: mode === SEGMENT_MODE.AUTO ? data.criteria : { groups: [] },
      memberIds: resolved.memberIds,
      memberCount: resolved.memberIds.length,
      lastSyncedAt: new Date(),
      createdBy: createdById || undefined,
    });

    return segment;
  }

  static async getAllSegments(query = {}) {
    const { page = 1, limit = 10, search } = query;
    const skip = (page - 1) * limit;

    const filter = {};
    if (search) filter.name = { $regex: search, $options: 'i' };

    const segments = await CustomerSegment.find(filter)
      .select('-memberIds')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await CustomerSegment.countDocuments(filter);

    return {
      segments,
      pagination: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / limit) },
    };
  }

  static async getSegmentById(id) {
    const segment = await CustomerSegment.findById(id).select('-memberIds');
    if (!segment) {
      throw new AppError('Không tìm thấy nhóm khách hàng', 404);
    }
    return segment;
  }

  static async updateSegment(id, data) {
    const segment = await CustomerSegment.findById(id);
    if (!segment) {
      throw new AppError('Không tìm thấy nhóm khách hàng', 404);
    }

    if (data.name !== undefined) segment.name = data.name;
    if (data.description !== undefined) segment.description = data.description;
    if (data.isActive !== undefined) segment.isActive = data.isActive;
    if (data.mode !== undefined) segment.mode = data.mode;
    if (data.isRealtimeUpdate !== undefined) segment.isRealtimeUpdate = !!data.isRealtimeUpdate;
    if (data.criteria !== undefined) segment.criteria = data.criteria;
    if (segment.mode === SEGMENT_MODE.MANUAL) segment.isRealtimeUpdate = false;

    const touchesMembers =
      data.criteria !== undefined || data.mode !== undefined || data.memberIds !== undefined;
    if (touchesMembers) {
      const resolved = await CustomerSegmentService.resolveMembers({
        mode: segment.mode,
        criteria: segment.criteria,
        memberIds: data.memberIds,
      });
      segment.memberIds = resolved.memberIds;
      segment.memberCount = resolved.memberIds.length;
      segment.lastSyncedAt = new Date();
    }

    await segment.save();

    return await CustomerSegment.findById(id).select('-memberIds');
  }

  static async deleteSegment(id) {
    const segment = await CustomerSegment.findById(id);
    if (!segment) {
      throw new AppError('Không tìm thấy nhóm khách hàng', 404);
    }

    const activeCampaign = await Campaign.findOne({ segmentIds: id, status: 'ACTIVE' });
    if (activeCampaign) {
      throw new AppError(`Không thể xóa: nhóm đang được sử dụng bởi chiến dịch "${activeCampaign.name}"`, 400);
    }

    await CustomerSegment.findByIdAndDelete(id);
    return {};
  }

  static async previewSegment(criteria, query = {}) {
    const { filter, hasCriteria } = CustomerSegmentService.buildFilter(criteria);
    if (!hasCriteria) {
      throw new AppError('Phải thiết lập ít nhất một tiêu chí lọc', 400);
    }

    const { page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const count = await Customer.countDocuments(filter);
    const members = await Customer.find(filter)
      .select(CUSTOMER_SELECT)
      .populate('tierId', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    return {
      count,
      members,
      pagination: { total: count, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(count / limit) },
    };
  }

  // Phát voucher bổ sung (best-effort) từ các chiến dịch ACTIVE nhắm tới segment này, cho
  // những thành viên VỪA được thêm vào so với trước khi đồng bộ. Không để lỗi ở đây làm
  // hỏng kết quả đồng bộ segment (vốn là thao tác chính).
  static async _topUpCampaignVouchers(segmentId, currentMemberIds, previousMemberIdSet) {
    const newMemberIds = currentMemberIds.filter((cid) => !previousMemberIdSet.has(String(cid)));
    if (newMemberIds.length === 0) return;
    try {
      await CampaignService.topUpVouchersForNewMembers(segmentId, newMemberIds);
    } catch (err) {
      console.error(`[Segment] Lỗi phát voucher bổ sung khi đồng bộ nhóm ${segmentId}:`, err.message);
    }
  }

  static async syncSegment(id) {
    const segment = await CustomerSegment.findById(id);
    if (!segment) {
      throw new AppError('Không tìm thấy nhóm khách hàng', 404);
    }

    const previousMemberIdSet = new Set(segment.memberIds.map(String));

    if (segment.mode === SEGMENT_MODE.MANUAL) {
      const memberIds = await Customer.find({ _id: { $in: segment.memberIds }, isActive: true }).distinct('_id');
      segment.memberIds = memberIds;
      segment.memberCount = memberIds.length;
      segment.lastSyncedAt = new Date();
      await segment.save();
      await CustomerSegmentService._topUpCampaignVouchers(segment._id, memberIds, previousMemberIdSet);
      return { memberCount: memberIds.length };
    }

    const { filter, hasCriteria } = CustomerSegmentService.buildFilter(segment.criteria);
    if (!hasCriteria) {
      return { memberCount: segment.memberCount };
    }
    const memberIds = await Customer.find(filter).distinct('_id');
    segment.memberIds = memberIds;
    segment.memberCount = memberIds.length;
    segment.lastSyncedAt = new Date();
    await segment.save();
    await CustomerSegmentService._topUpCampaignVouchers(segment._id, memberIds, previousMemberIdSet);

    return { memberCount: segment.memberCount, lastSyncedAt: segment.lastSyncedAt };
  }

  static async syncAllSegments() {
    const segments = await CustomerSegment.find({ isActive: IS_ACTIVE.TRUE, mode: SEGMENT_MODE.AUTO }).select('_id');
    let synced = 0;
    for (const s of segments) {
      await CustomerSegmentService.syncSegment(s._id);
      synced += 1;
    }
    return { synced };
  }

  static async resyncRealtimeSegments() {
    try {
      const segments = await CustomerSegment.find({
        isActive: IS_ACTIVE.TRUE,
        mode: SEGMENT_MODE.AUTO,
        isRealtimeUpdate: true,
      }).select('_id');
      for (const s of segments) {
        await CustomerSegmentService.syncSegment(s._id);
      }
      return { synced: segments.length };
    } catch (err) {
      console.error('[Segment] resyncRealtimeSegments error:', err.message);
      return { synced: 0 };
    }
  }

  static async toggleActive(id) {
    const segment = await CustomerSegment.findById(id);
    if (!segment) {
      throw new AppError('Không tìm thấy nhóm khách hàng', 404);
    }
    segment.isActive = segment.isActive === IS_ACTIVE.TRUE ? IS_ACTIVE.FALSE : IS_ACTIVE.TRUE;
    await segment.save();
    return { isActive: segment.isActive };
  }

  static async getSegmentMembers(id, query = {}) {
    const { page = 1, limit = 10, search } = query;
    const skip = (page - 1) * limit;

    const segment = await CustomerSegment.findById(id).select('memberIds memberCount name');
    if (!segment) {
      throw new AppError('Không tìm thấy nhóm khách hàng', 404);
    }

    if (search && String(search).trim()) {
      const rx = { $regex: String(search).trim(), $options: 'i' };
      const filter = {
        _id: { $in: segment.memberIds },
        $or: [{ fullName: rx }, { phone: rx }, { email: rx }],
      };
      const total = await Customer.countDocuments(filter);
      const members = await Customer.find(filter)
        .select(CUSTOMER_SELECT)
        .populate('tierId', 'name')
        .skip(skip)
        .limit(parseInt(limit));
      return {
        members,
        pagination: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / limit) },
      };
    }

    const memberIdsPage = segment.memberIds.slice(skip, skip + parseInt(limit));
    const members = await Customer.find({ _id: { $in: memberIdsPage } })
      .select(CUSTOMER_SELECT)
      .populate('tierId', 'name');

    return {
      members,
      pagination: {
        total: segment.memberCount,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(segment.memberCount / limit),
      },
    };
  }
}

module.exports = CustomerSegmentService;
