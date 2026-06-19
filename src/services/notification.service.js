const Notification = require('../models/notification.model');

class NotificationService {
  static async searchNotifications(payload) {
    const page = parseInt(payload.page || 1, 10);
    const limit = parseInt(payload.pageSize || payload.limit || 10, 10);
    const skip = (page - 1) * limit;
    const search = payload.search || payload.keyword || '';

    const filter = {};
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } },
      ];
    }

    if (payload.status) {
      filter.status = payload.status;
    }

    if (payload.recipientType) {
      filter.recipientType = payload.recipientType;
    }

    const items = await Notification.find(filter)
      .populate('createdBy')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Notification.countDocuments(filter);

    return {
      status: 200,
      success: true,
      message: 'Tìm kiếm thông báo thành công',
      data: items,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async getNotificationById(id) {
    return await Notification.findById(id).populate('createdBy');
  }

  static async createNotification(data, employeeId) {
    if (employeeId) {
      data.createdBy = employeeId;
    }
    return await Notification.create(data);
  }

  static async updateNotification(id, data) {
    return await Notification.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    });
  }

  static async deleteNotification(id) {
    return await Notification.findByIdAndDelete(id);
  }

  static async updateNotificationStatus(id, data) {
    const updateFields = {};
    if (data.isRead !== undefined) {
      updateFields.isRead = data.isRead;
    }
    if (data.status !== undefined) {
      updateFields.status = data.status;
    }
    return await Notification.findByIdAndUpdate(id, updateFields, { new: true });
  }
}

module.exports = NotificationService;
