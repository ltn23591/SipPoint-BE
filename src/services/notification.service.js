const Notification = require('../models/notification.model');
const Customer = require('../models/customer.model');
const CustomerSegment = require('../models/customerSegment.model');
const sendEmail = require('../utils/email');
const logger = require('../config/logger');

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
      .populate('tierId')
      .populate('segmentId')
      .populate('voucherId')
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
    return await Notification.findById(id)
      .populate('createdBy')
      .populate('tierId')
      .populate('segmentId')
      .populate('voucherId');
  }

  static async createNotification(data, employeeId) {
    if (employeeId) {
      data.createdBy = employeeId;
    }
    const notification = await Notification.create(data);

    // Gửi Email thông báo cho các Khách hàng thuộc đối tượng / Nhóm được chọn
    try {
      if (data.recipientType !== 'staff') {
        let customerQuery = { isActive: true };
        if (data.recipientType === 'segment' && data.segmentId) {
          const segment = await CustomerSegment.findById(data.segmentId);
          if (segment && segment.memberIds && segment.memberIds.length) {
            customerQuery._id = { $in: segment.memberIds };
          } else {
            customerQuery._id = null; // Không có thành viên
          }
        } else if (data.recipientId) {
          customerQuery._id = data.recipientId;
        }

        const targetCustomers = await Customer.find(customerQuery);

        for (const customer of targetCustomers) {
          if (customer.email) {
            sendEmail({
              email: customer.email,
              subject: `[SipPoint] ${data.title}`,
              html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; line-height: 1.6;">
                  <h2 style="color: #2b8a3e;">${data.title}</h2>
                  <p>Xin chào <b>${customer.fullName}</b>,</p>
                  <p>${data.content}</p>
                  <p>Cảm ơn bạn đã đồng hành cùng SipPoint!</p>
                </div>
              `,
            }).catch((err) => logger.warn(`[Campaign Email Error]: ${err.message}`));
          }
        }
      }
    } catch (err) {
      logger.error(`[Notification Campaign Auto Issue Error]: ${err.message}`);
    }

    return notification;
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

