const CustomerSegment = require('../models/customerSegment.model');
const Customer = require('../models/customer.model');
const Campaign = require('../models/campaign.model');
const { IS_ACTIVE, SEGMENT_MODE } = require('../enums');

// Số select dùng chung khi trả về khách hàng (preview / members)
const CUSTOMER_SELECT = 'fullName phone email gender currentPoints orderCount redeemCount tierId dateOfBirth lastVisitAt';

// Ngày cách hiện tại `years` năm (dùng cho tiêu chí tuổi)
const dateYearsAgo = (years) => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - Number(years));
  return d;
};

// Bộ lọc số cho eq/gt/lt/between
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

// Bộ lọc theo tuổi (quy đổi ra khoảng dateOfBirth)
const ageFilter = (operator, value) => {
  switch (operator) {
    case 'eq': {
      const n = Number(value);
      return { dateOfBirth: { $ne: null, $gt: dateYearsAgo(n + 1), $lte: dateYearsAgo(n) } };
    }
    case 'gt': // tuổi > N  ⟺ sinh trước mốc (N+1) năm
      return { dateOfBirth: { $ne: null, $lte: dateYearsAgo(Number(value) + 1) } };
    case 'lt': // tuổi < N  ⟺ sinh sau mốc N năm
      return { dateOfBirth: { $ne: null, $gt: dateYearsAgo(Number(value)) } };
    case 'between': {
      const [min, max] = Array.isArray(value) ? value : [value?.min, value?.max];
      return { dateOfBirth: { $ne: null, $gt: dateYearsAgo(Number(max) + 1), $lte: dateYearsAgo(Number(min)) } };
    }
    default:
      return null;
  }
};

class CustomerSegmentService {
  // Một điều kiện -> một filter con trên collection customers (null nếu không hợp lệ)
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

  // Một nhóm (AND) -> { $and: [...] } (null nếu không có điều kiện hợp lệ)
  static buildGroup(group) {
    const conds = (group?.conditions || [])
      .map((c) => CustomerSegmentService.buildCondition(c))
      .filter(Boolean);
    if (conds.length === 0) return null;
    return { $and: conds };
  }

  // criteria { groups } -> Mongo filter (các nhóm nối OR)
  static buildFilter(criteria = {}) {
    const groups = (criteria.groups || [])
      .map((g) => CustomerSegmentService.buildGroup(g))
      .filter(Boolean);

    if (groups.length === 0) {
      return { filter: { isActive: true }, hasCriteria: false };
    }
    return { filter: { isActive: true, $or: groups }, hasCriteria: true };
  }

  // Materialize memberIds theo mode
  static async resolveMembers(data) {
    if (data.mode === SEGMENT_MODE.MANUAL) {
      const provided = (data.memberIds || []).filter(Boolean);
      if (provided.length === 0) {
        return { error: { status: 400, success: false, message: 'Nhóm thủ công phải chọn ít nhất một khách hàng' } };
      }
      // Chỉ giữ khách hàng tồn tại & đang hoạt động
      const memberIds = await Customer.find({ _id: { $in: provided }, isActive: true }).distinct('_id');
      return { memberIds };
    }

    // AUTO
    const { filter, hasCriteria } = CustomerSegmentService.buildFilter(data.criteria);
    if (!hasCriteria) {
      return { error: { status: 400, success: false, message: 'Phải thiết lập ít nhất một tiêu chí lọc' } };
    }
    const memberIds = await Customer.find(filter).distinct('_id');
    return { memberIds };
  }

  static async createSegment(data, createdById) {
    const existing = await CustomerSegment.findOne({ name: data.name });
    if (existing) {
      return { status: 400, success: false, message: 'Tên nhóm khách hàng đã tồn tại' };
    }

    const mode = data.mode === SEGMENT_MODE.MANUAL ? SEGMENT_MODE.MANUAL : SEGMENT_MODE.AUTO;
    const resolved = await CustomerSegmentService.resolveMembers({ ...data, mode });
    if (resolved.error) return resolved.error;

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

    return { status: 201, success: true, message: 'Tạo nhóm khách hàng thành công', data: segment };
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
      status: 200,
      success: true,
      message: 'Lấy danh sách nhóm khách hàng thành công',
      data: segments,
      pagination: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / limit) },
    };
  }

  static async getSegmentById(id) {
    const segment = await CustomerSegment.findById(id).select('-memberIds');
    if (!segment) {
      return { status: 404, success: false, message: 'Không tìm thấy nhóm khách hàng' };
    }
    return { status: 200, success: true, message: 'Lấy chi tiết nhóm khách hàng thành công', data: segment };
  }

  static async updateSegment(id, data) {
    const segment = await CustomerSegment.findById(id);
    if (!segment) {
      return { status: 404, success: false, message: 'Không tìm thấy nhóm khách hàng' };
    }

    if (data.name !== undefined) segment.name = data.name;
    if (data.description !== undefined) segment.description = data.description;
    if (data.isActive !== undefined) segment.isActive = data.isActive;
    if (data.mode !== undefined) segment.mode = data.mode;
    if (data.isRealtimeUpdate !== undefined) segment.isRealtimeUpdate = !!data.isRealtimeUpdate;
    if (data.criteria !== undefined) segment.criteria = data.criteria;
    // Nhóm thủ công không dùng cập nhật realtime
    if (segment.mode === SEGMENT_MODE.MANUAL) segment.isRealtimeUpdate = false;

    // Nếu đổi tiêu chí / mode / danh sách tay -> materialize lại thành viên
    const touchesMembers =
      data.criteria !== undefined || data.mode !== undefined || data.memberIds !== undefined;
    if (touchesMembers) {
      const resolved = await CustomerSegmentService.resolveMembers({
        mode: segment.mode,
        criteria: segment.criteria,
        memberIds: data.memberIds,
      });
      if (resolved.error) return resolved.error;
      segment.memberIds = resolved.memberIds;
      segment.memberCount = resolved.memberIds.length;
      segment.lastSyncedAt = new Date();
    }

    await segment.save();

    const updated = await CustomerSegment.findById(id).select('-memberIds');
    return { status: 200, success: true, message: 'Cập nhật nhóm khách hàng thành công', data: updated };
  }

  static async deleteSegment(id) {
    const segment = await CustomerSegment.findById(id);
    if (!segment) {
      return { status: 404, success: false, message: 'Không tìm thấy nhóm khách hàng' };
    }

    const activeCampaign = await Campaign.findOne({ segmentIds: id, status: 'ACTIVE' });
    if (activeCampaign) {
      return {
        status: 400,
        success: false,
        message: `Không thể xóa: nhóm đang được sử dụng bởi chiến dịch "${activeCampaign.name}"`,
      };
    }

    await CustomerSegment.findByIdAndDelete(id);
    return { status: 200, success: true, message: 'Xóa nhóm khách hàng thành công' };
  }

  // Xem trước khách hàng thỏa bộ tiêu chí (có phân trang cho modal)
  static async previewSegment(criteria, query = {}) {
    const { filter, hasCriteria } = CustomerSegmentService.buildFilter(criteria);
    if (!hasCriteria) {
      return { status: 400, success: false, message: 'Phải thiết lập ít nhất một tiêu chí lọc' };
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
      status: 200,
      success: true,
      message: `Có ${count.toLocaleString('vi-VN')} khách hàng phù hợp`,
      data: { count, members },
      pagination: { total: count, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(count / limit) },
    };
  }

  // Đồng bộ lại thành viên của 1 nhóm (chỉ có ý nghĩa với AUTO)
  static async syncSegment(id) {
    const segment = await CustomerSegment.findById(id);
    if (!segment) {
      return { status: 404, success: false, message: 'Không tìm thấy nhóm khách hàng' };
    }

    if (segment.mode === SEGMENT_MODE.MANUAL) {
      // Nhóm thủ công: chỉ lọc bỏ khách đã ngừng hoạt động, không đổi tiêu chí
      const memberIds = await Customer.find({ _id: { $in: segment.memberIds }, isActive: true }).distinct('_id');
      segment.memberIds = memberIds;
      segment.memberCount = memberIds.length;
      segment.lastSyncedAt = new Date();
      await segment.save();
      return { status: 200, success: true, message: 'Đồng bộ nhóm (thủ công) thành công', data: { memberCount: memberIds.length } };
    }

    const { filter, hasCriteria } = CustomerSegmentService.buildFilter(segment.criteria);
    // An toàn: nhóm không có tiêu chí hợp lệ (vd dữ liệu cũ) -> giữ nguyên, KHÔNG quét toàn bộ KH
    if (!hasCriteria) {
      return { status: 200, success: true, message: 'Nhóm chưa có tiêu chí hợp lệ, bỏ qua đồng bộ', data: { memberCount: segment.memberCount } };
    }
    const memberIds = await Customer.find(filter).distinct('_id');
    segment.memberIds = memberIds;
    segment.memberCount = memberIds.length;
    segment.lastSyncedAt = new Date();
    await segment.save();

    return {
      status: 200,
      success: true,
      message: 'Đồng bộ nhóm khách hàng thành công',
      data: { memberCount: segment.memberCount, lastSyncedAt: segment.lastSyncedAt },
    };
  }

  // Cron 00:00: chỉ đồng bộ các nhóm AUTO đang hoạt động
  static async syncAllSegments() {
    const segments = await CustomerSegment.find({ isActive: IS_ACTIVE.TRUE, mode: SEGMENT_MODE.AUTO }).select('_id');
    let synced = 0;
    for (const s of segments) {
      await CustomerSegmentService.syncSegment(s._id);
      synced += 1;
    }
    return { synced };
  }

  // Gọi khi dữ liệu KH vừa thay đổi (đơn hoàn tất / đổi quà):
  // đồng bộ ngay các nhóm AUTO có bật cập nhật realtime. Best-effort, không chặn luồng chính.
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

  // Bật/tắt trạng thái hoạt động của nhóm
  static async toggleActive(id) {
    const segment = await CustomerSegment.findById(id);
    if (!segment) {
      return { status: 404, success: false, message: 'Không tìm thấy nhóm khách hàng' };
    }
    segment.isActive = segment.isActive === IS_ACTIVE.TRUE ? IS_ACTIVE.FALSE : IS_ACTIVE.TRUE;
    await segment.save();
    return {
      status: 200,
      success: true,
      message: segment.isActive === IS_ACTIVE.TRUE ? 'Đã kích hoạt nhóm' : 'Đã tạm ngưng nhóm',
      data: { isActive: segment.isActive },
    };
  }

  static async getSegmentMembers(id, query = {}) {
    const { page = 1, limit = 10, search } = query;
    const skip = (page - 1) * limit;

    const segment = await CustomerSegment.findById(id).select('memberIds memberCount name');
    if (!segment) {
      return { status: 404, success: false, message: 'Không tìm thấy nhóm khách hàng' };
    }

    // Có tìm kiếm: lọc trong tập thành viên theo tên/SĐT/email (query + phân trang trên DB)
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
        status: 200,
        success: true,
        message: 'Lấy danh sách thành viên nhóm thành công',
        data: members,
        pagination: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / limit) },
      };
    }

    const memberIdsPage = segment.memberIds.slice(skip, skip + parseInt(limit));
    const members = await Customer.find({ _id: { $in: memberIdsPage } })
      .select(CUSTOMER_SELECT)
      .populate('tierId', 'name');

    return {
      status: 200,
      success: true,
      message: 'Lấy danh sách thành viên nhóm thành công',
      data: members,
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
