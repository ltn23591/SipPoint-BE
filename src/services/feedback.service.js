const Feedback = require('../models/feedback.model');
const exceljs = require('exceljs');

class FeedbackService {
  static async searchFeedbacks(payload) {
    const page = parseInt(payload.page || 1, 10);
    const limit = parseInt(payload.pageSize || payload.limit || 10, 10);
    const skip = (page - 1) * limit;
    const search = payload.search || payload.keyword || '';

    const filter = {};
    if (search) {
      filter.comment = { $regex: search, $options: 'i' };
    }

    if (payload.rating) {
      filter.rating = parseInt(payload.rating, 10);
    }

    if (payload.status) {
      filter.status = payload.status;
    }

    const items = await Feedback.find(filter)
      .populate('customerId orderId replyBy')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Feedback.countDocuments(filter);

    return {
      status: 200,
      success: true,
      message: 'Tìm kiếm đánh giá thành công',
      data: items,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async getFeedbackById(id) {
    return await Feedback.findById(id).populate('customerId orderId replyBy');
  }

  static async updateFeedback(id, data, employeeId) {
    const updateData = { ...data };
    if (employeeId && data.reply) {
      updateData.replyBy = employeeId;
    }
    return await Feedback.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });
  }

  static async exportFeedbacks(payload, res) {
    const feedbacks = await Feedback.find(payload).populate('customerId orderId');
    const workbook = new exceljs.Workbook();
    const worksheet = workbook.addWorksheet('Feedbacks');

    worksheet.columns = [
      { header: 'ID', key: '_id', width: 25 },
      { header: 'Khách hàng', key: 'customerName', width: 25 },
      { header: 'Đơn hàng', key: 'orderId', width: 25 },
      { header: 'Điểm đánh giá', key: 'rating', width: 15 },
      { header: 'Nội dung', key: 'comment', width: 40 },
      { header: 'Phản hồi', key: 'reply', width: 40 },
      { header: 'Trạng thái', key: 'status', width: 15 },
      { header: 'Ngày tạo', key: 'createdAt', width: 25 },
    ];

    feedbacks.forEach((fb) => {
      worksheet.addRow({
        _id: fb._id.toString(),
        customerName: fb.customerId ? (fb.customerId.fullName || fb.customerId.name || '') : 'Ẩn danh',
        orderId: fb.orderId ? fb.orderId._id.toString() : '',
        rating: fb.rating,
        comment: fb.comment,
        reply: fb.reply || '',
        status: fb.status,
        createdAt: fb.createdAt,
      });
    });

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=feedbacks.xlsx'
    );

    await workbook.xlsx.write(res);
    res.end();
  }
}

module.exports = FeedbackService;
