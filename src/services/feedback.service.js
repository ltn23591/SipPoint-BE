const exceljs = require('exceljs');
const Feedback = require('../models/feedback.model');
const Order = require('../models/order.model');
const Customer = require('../models/customer.model');
const CustomerService = require('./customer.service');
const AppError = require('../utils/AppError');
const { emitToAll } = require('./socket.service');
const { IS_ACTIVE, ORDER_STATUS, POINT_TRANSACTION_TYPE } = require('../enums');

const FEEDBACK_BONUS_POINTS = 5;

class FeedbackService {
  static async createFeedback(payload = {}) {
    const { orderId, rating, comment = '' } = payload;

    if (!orderId) {
      throw new AppError('Mã đơn hàng là bắt buộc để gửi đánh giá', 400);
    }

    const numericRating = Number(rating);
    if (!Number.isInteger(numericRating) || numericRating < 1 || numericRating > 5) {
      throw new AppError('Số sao đánh giá phải là số nguyên từ 1 đến 5', 400);
    }

    const order = await Order.findById(orderId).populate('customerId', 'fullName phone');
    if (!order || order.isActive === IS_ACTIVE.FALSE) {
      throw new AppError('Không tìm thấy đơn hàng', 404);
    }

    if (order.status !== ORDER_STATUS.COMPLETED) {
      throw new AppError('Chỉ có thể đánh giá đơn hàng đã hoàn tất', 400);
    }

    const existing = await Feedback.findOne({ orderId: order._id });
    if (existing) {
      throw new AppError('Đơn hàng này đã được đánh giá trước đó', 400);
    }

    const customerRef = order.customerId;
    const customerId = customerRef?._id || customerRef || null;
    let customerName = customerRef?.fullName || 'Khách vãng lai';
    let customerPhone = customerRef?.phone || '';

    if (customerId && !customerRef?.fullName) {
      const cust = await Customer.findById(customerId).select('fullName phone');
      if (cust) {
        customerName = cust.fullName || customerName;
        customerPhone = cust.phone || customerPhone;
      }
    }

    let bonusPointsAwarded = 0;
    if (customerId) {
      try {
        const pointRes = await CustomerService.adjustPoints(
          customerId,
          FEEDBACK_BONUS_POINTS,
          `Thưởng đánh giá đơn ${order.code}`,
          `Cảm ơn bạn đã đánh giá ${numericRating} sao cho đơn hàng ${order.code}`,
          POINT_TRANSACTION_TYPE.REWARD,
          { orderId: order._id }
        );
        if (pointRes?.success) {
          bonusPointsAwarded = FEEDBACK_BONUS_POINTS;
        }
      } catch (err) {
        console.error('[Feedback] Không thể cộng điểm thưởng đánh giá:', err.message);
      }
    }

    const created = await Feedback.create({
      orderId: order._id,
      customerId,
      customerName,
      customerPhone,
      rating: numericRating,
      comment: String(comment || '').trim(),
      bonusPointsAwarded,
      isActive: IS_ACTIVE.TRUE,
    });

    const populated = await Feedback.findById(created._id)
      .populate('orderId', 'code total createdAt tableId')
      .populate('customerId', 'fullName phone email avatar')
      .populate('repliedBy', 'name email');

    emitToAll('feedback_created', populated);

    return populated;
  }

  static async getFeedbackByOrder(orderId) {
    if (!orderId) return null;
    const feedback = await Feedback.findOne({ orderId })
      .populate('orderId', 'code total createdAt')
      .populate('customerId', 'fullName phone')
      .populate('repliedBy', 'name email')
      .lean();
    return feedback;
  }

  static async getFeedbackById(id) {
    const feedback = await Feedback.findById(id)
      .populate({
        path: 'orderId',
        select: 'code total subtotal discount createdAt paymentMethod tableId items',
        populate: { path: 'tableId', select: 'name' },
      })
      .populate('customerId', 'fullName phone email avatar')
      .populate('repliedBy', 'name email')
      .lean();

    if (!feedback) {
      throw new AppError('Không tìm thấy đánh giá', 404);
    }
    return feedback;
  }

  static async searchFeedbacks(payload = {}) {
    const page = Math.max(1, parseInt(payload.page || payload.pageNumber || 1, 10));
    const limit = Math.max(1, parseInt(payload.limit || payload.pageSize || 10, 10));
    const skip = (page - 1) * limit;
    const keyword = String(payload.keyword || payload.search || '').trim();
    const rating = payload.rating ? Number(payload.rating) : null;
    const hasReply = payload.hasReply;
    const isActive = payload.isActive;

    const filter = {};
    if (isActive && isActive !== 'all') {
      filter.isActive = isActive;
    }
    if (rating && rating >= 1 && rating <= 5) {
      filter.rating = rating;
    }
    if (hasReply === 'replied' || hasReply === true) {
      filter.adminReply = { $nin: ['', null] };
    } else if (hasReply === 'unreplied' || hasReply === false) {
      filter.adminReply = { $in: ['', null] };
    }

    if (keyword) {
      const matchedOrders = await Order.find({
        code: { $regex: keyword, $options: 'i' },
      }).select('_id');
      const orderIds = matchedOrders.map((o) => o._id);

      filter.$or = [
        { customerName: { $regex: keyword, $options: 'i' } },
        { customerPhone: { $regex: keyword, $options: 'i' } },
        { comment: { $regex: keyword, $options: 'i' } },
        { adminReply: { $regex: keyword, $options: 'i' } },
        ...(orderIds.length > 0 ? [{ orderId: { $in: orderIds } }] : []),
      ];
    }

    const [items, total, statsAgg] = await Promise.all([
      Feedback.find(filter)
        .populate({
          path: 'orderId',
          select: 'code total createdAt tableId',
          populate: { path: 'tableId', select: 'name' },
        })
        .populate('customerId', 'fullName phone email avatar')
        .populate('repliedBy', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Feedback.countDocuments(filter),
      Feedback.aggregate([
        { $match: { isActive: { $ne: IS_ACTIVE.FALSE } } },
        {
          $group: {
            _id: null,
            totalReviews: { $sum: 1 },
            avgRating: { $avg: '$rating' },
            repliedCount: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $ne: ['$adminReply', ''] },
                      { $ne: ['$adminReply', null] },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
            star5: { $sum: { $cond: [{ $eq: ['$rating', 5] }, 1, 0] } },
            star4: { $sum: { $cond: [{ $eq: ['$rating', 4] }, 1, 0] } },
            star3: { $sum: { $cond: [{ $eq: ['$rating', 3] }, 1, 0] } },
            star2: { $sum: { $cond: [{ $eq: ['$rating', 2] }, 1, 0] } },
            star1: { $sum: { $cond: [{ $eq: ['$rating', 1] }, 1, 0] } },
          },
        },
      ]),
    ]);

    const rawSummary = statsAgg[0] || {
      totalReviews: 0,
      avgRating: 0,
      repliedCount: 0,
      star5: 0,
      star4: 0,
      star3: 0,
      star2: 0,
      star1: 0,
    };

    return {
      items,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      summary: {
        totalReviews: rawSummary.totalReviews || 0,
        avgRating: rawSummary.avgRating ? Number(rawSummary.avgRating.toFixed(1)) : 0,
        repliedCount: rawSummary.repliedCount || 0,
        unrepliedCount: Math.max(0, (rawSummary.totalReviews || 0) - (rawSummary.repliedCount || 0)),
        ratingCounts: {
          5: rawSummary.star5 || 0,
          4: rawSummary.star4 || 0,
          3: rawSummary.star3 || 0,
          2: rawSummary.star2 || 0,
          1: rawSummary.star1 || 0,
        },
      },
    };
  }

  static async updateFeedback(id, payload = {}, employeeId = null) {
    const feedbackId = id || payload.id || payload._id;
    if (!feedbackId) {
      throw new AppError('Thiếu ID đánh giá cần cập nhật', 400);
    }

    const feedback = await Feedback.findById(feedbackId);
    if (!feedback) {
      throw new AppError('Không tìm thấy đánh giá', 404);
    }

    if (payload.adminReply !== undefined) {
      feedback.adminReply = String(payload.adminReply || '').trim();
      feedback.repliedAt = feedback.adminReply ? new Date() : null;
      feedback.repliedBy = feedback.adminReply ? employeeId : null;
    }

    if (payload.isActive !== undefined && Object.values(IS_ACTIVE).includes(payload.isActive)) {
      feedback.isActive = payload.isActive;
    }

    await feedback.save();

    return this.getFeedbackById(feedback._id);
  }

  static async exportFeedbacks(payload = {}, res) {
    const { items } = await this.searchFeedbacks({ ...payload, page: 1, limit: 5000 });
    const workbook = new exceljs.Workbook();
    const worksheet = workbook.addWorksheet('Đánh giá khách hàng');

    worksheet.columns = [
      { header: 'Mã đơn hàng', key: 'orderCode', width: 18 },
      { header: 'Khách hàng', key: 'customerName', width: 25 },
      { header: 'Số điện thoại', key: 'customerPhone', width: 16 },
      { header: 'Số sao', key: 'rating', width: 10 },
      { header: 'Nhận xét', key: 'comment', width: 40 },
      { header: 'Phản hồi của quán', key: 'adminReply', width: 40 },
      { header: 'Trạng thái', key: 'status', width: 14 },
      { header: 'Thời gian', key: 'createdAt', width: 22 },
    ];

    items.forEach((f) => {
      worksheet.addRow({
        orderCode: f.orderId?.code || '—',
        customerName: f.customerName || f.customerId?.fullName || 'Khách lẻ',
        customerPhone: f.customerPhone || f.customerId?.phone || '—',
        rating: `${f.rating} sao`,
        comment: f.comment || '',
        adminReply: f.adminReply || '',
        status: f.isActive === IS_ACTIVE.TRUE ? 'Hiển thị' : 'Đã ẩn',
        createdAt: f.createdAt ? new Date(f.createdAt).toLocaleString('vi-VN') : '',
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=danh-gia-khach-hang.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  }
}

module.exports = FeedbackService;

