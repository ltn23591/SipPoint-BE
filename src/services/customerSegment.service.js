const CustomerSegment = require('../models/customerSegment.model');
const Customer = require('../models/customer.model');
const Campaign = require('../models/campaign.model');
const { IS_ACTIVE } = require('../enums');

class CustomerSegmentService {
  // Chuyển bộ tiêu chí thành MongoDB filter trên collection customers
  static buildFilter(criteria = {}) {
    const filter = { isActive: true };
    const conditions = [];

    if (Array.isArray(criteria.tierIds) && criteria.tierIds.length > 0) {
      conditions.push({ tierId: { $in: criteria.tierIds } });
    }

    if (criteria.birthdayMonth) {
      conditions.push({
        dateOfBirth: { $ne: null },
        $expr: { $eq: [{ $month: '$dateOfBirth' }, Number(criteria.birthdayMonth)] },
      });
    }

    if (criteria.minPoints !== undefined && criteria.minPoints !== null) {
      conditions.push({ currentPoints: { $gte: Number(criteria.minPoints) } });
    }

    const now = Date.now();
    const DAY_MS = 24 * 60 * 60 * 1000;
    // Chưa ghé quán ít nhất X ngày (lastVisitAt <= now - X ngày)
    if (criteria.minDaysSinceLastVisit !== undefined && criteria.minDaysSinceLastVisit !== null) {
      conditions.push({ lastVisitAt: { $ne: null, $lte: new Date(now - Number(criteria.minDaysSinceLastVisit) * DAY_MS) } });
    }
    // Có ghé quán trong vòng X ngày (lastVisitAt >= now - X ngày)
    if (criteria.maxDaysSinceLastVisit !== undefined && criteria.maxDaysSinceLastVisit !== null) {
      conditions.push({ lastVisitAt: { $ne: null, $gte: new Date(now - Number(criteria.maxDaysSinceLastVisit) * DAY_MS) } });
    }

    if (conditions.length > 0) {
      filter.$and = conditions;
    }
    return { filter, hasCriteria: conditions.length > 0 };
  }

  static async createSegment(data, createdById) {
    const { filter, hasCriteria } = CustomerSegmentService.buildFilter(data.criteria);
    if (!hasCriteria) {
      return { status: 400, success: false, message: 'Phải thiết lập ít nhất một tiêu chí lọc' };
    }

    const existing = await CustomerSegment.findOne({ name: data.name });
    if (existing) {
      return { status: 400, success: false, message: 'Tên nhóm khách hàng đã tồn tại' };
    }

    // Materialize thành viên ngay khi tạo
    const memberIds = await Customer.find(filter).distinct('_id');
    const segment = await CustomerSegment.create({
      name: data.name,
      description: data.description,
      criteria: data.criteria,
      memberIds,
      memberCount: memberIds.length,
      lastSyncedAt: new Date(),
      createdBy: createdById || undefined,
    });

    return { status: 201, success: true, message: 'Tạo nhóm khách hàng thành công', data: segment };
  }

  static async getAllSegments(query = {}) {
    const { page = 1, limit = 10, search } = query;
    const skip = (page - 1) * limit;

    const filter = {};
    if (search) {
      filter.name = { $regex: search, $options: 'i' };
    }

    const segments = await CustomerSegment.find(filter)
      .select('-memberIds')
      .populate('criteria.tierIds', 'name minPoints')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await CustomerSegment.countDocuments(filter);

    return {
      status: 200,
      success: true,
      message: 'Lấy danh sách nhóm khách hàng thành công',
      data: segments,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async getSegmentById(id) {
    const segment = await CustomerSegment.findById(id)
      .select('-memberIds')
      .populate('criteria.tierIds', 'name minPoints');
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
    if (data.criteria !== undefined) {
      const { hasCriteria } = CustomerSegmentService.buildFilter(data.criteria);
      if (!hasCriteria) {
        return { status: 400, success: false, message: 'Phải thiết lập ít nhất một tiêu chí lọc' };
      }
      segment.criteria = data.criteria;
    }

    await segment.save();

    // Đồng bộ lại thành viên nếu tiêu chí thay đổi
    if (data.criteria !== undefined) {
      await CustomerSegmentService.syncSegment(segment._id);
    }

    const updated = await CustomerSegment.findById(id).select('-memberIds');
    return { status: 200, success: true, message: 'Cập nhật nhóm khách hàng thành công', data: updated };
  }

  static async deleteSegment(id) {
    const segment = await CustomerSegment.findById(id);
    if (!segment) {
      return { status: 404, success: false, message: 'Không tìm thấy nhóm khách hàng' };
    }

    // Chặn xóa nếu đang được campaign ACTIVE tham chiếu
    try {
      const activeCampaign = await Campaign.findOne({ segmentIds: id, status: 'ACTIVE' });
      if (activeCampaign) {
        return {
          status: 400,
          success: false,
          message: `Không thể xóa: nhóm đang được sử dụng bởi chiến dịch "${activeCampaign.name}"`,
        };
      }
    } catch (e) {
      return {
        status: 400,
        success: false,
        message: `Không thể xóa: ${e.message}`,
      };
    }

    await CustomerSegment.findByIdAndDelete(id);
    return { status: 200, success: true, message: 'Xóa nhóm khách hàng thành công' };
  }

  // Xem trước số lượng khách hàng thỏa mãn bộ tiêu chí (không lưu)
  static async previewSegment(criteria) {
    const { filter, hasCriteria } = CustomerSegmentService.buildFilter(criteria);
    if (!hasCriteria) {
      return { status: 400, success: false, message: 'Phải thiết lập ít nhất một tiêu chí lọc' };
    }

    const count = await Customer.countDocuments(filter);
    const sample = await Customer.find(filter)
      .select('customerId fullName phone currentPoints tierId dateOfBirth lastVisitAt')
      .populate('tierId', 'name')
      .limit(10);

    return {
      status: 200,
      success: true,
      message: `Có ${count.toLocaleString('vi-VN')} khách hàng phù hợp`,
      data: { count, sample },
    };
  }

  // Đồng bộ lại danh sách thành viên của một nhóm
  static async syncSegment(id) {
    const segment = await CustomerSegment.findById(id);
    if (!segment) {
      return { status: 404, success: false, message: 'Không tìm thấy nhóm khách hàng' };
    }

    const { filter } = CustomerSegmentService.buildFilter(segment.criteria);
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

  // Cron 00:00 hằng ngày: đồng bộ toàn bộ nhóm đang hoạt động
  static async syncAllSegments() {
    const segments = await CustomerSegment.find({ isActive: IS_ACTIVE.TRUE }).select('_id');
    let synced = 0;
    for (const s of segments) {
      await CustomerSegmentService.syncSegment(s._id);
      synced += 1;
    }
    return { synced };
  }

  // Danh sách thành viên của nhóm (phân trang)
  static async getSegmentMembers(id, query = {}) {
    const { page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const segment = await CustomerSegment.findById(id).select('memberIds memberCount name');
    if (!segment) {
      return { status: 404, success: false, message: 'Không tìm thấy nhóm khách hàng' };
    }

    const memberIdsPage = segment.memberIds.slice(skip, skip + parseInt(limit));
    const members = await Customer.find({ _id: { $in: memberIdsPage } })
      .select('customerId fullName phone email currentPoints tierId dateOfBirth lastVisitAt')
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
