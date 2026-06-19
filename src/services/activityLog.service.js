const ActivityLog = require('../models/activityLog.model');

class ActivityLogService {
  static async searchLogs(payload) {
    const page = parseInt(payload.page || 1, 10);
    const limit = parseInt(payload.pageSize || payload.limit || 10, 10);
    const skip = (page - 1) * limit;
    const search = payload.search || payload.keyword || '';

    const filter = {};
    if (search) {
      filter.$or = [
        { action: { $regex: search, $options: 'i' } },
        { target: { $regex: search, $options: 'i' } },
        { details: { $regex: search, $options: 'i' } },
      ];
    }

    if (payload.employeeId) {
      filter.employeeId = payload.employeeId;
    }

    const items = await ActivityLog.find(filter)
      .populate('employeeId')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await ActivityLog.countDocuments(filter);

    return {
      status: 200,
      success: true,
      message: 'Tìm kiếm nhật ký hoạt động thành công',
      data: items,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async logActivity(employeeId, action, target, details, ipAddress) {
    try {
      await ActivityLog.create({
        employeeId,
        action,
        target,
        details,
        ipAddress,
      });
    } catch (err) {
      console.error('Lỗi khi ghi nhận nhật ký hoạt động:', err);
    }
  }
}

module.exports = ActivityLogService;
