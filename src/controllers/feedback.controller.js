const catchAsync = require('../utils/catchAsync');
const FeedbackService = require('../services/feedback.service');

class FeedbackController {
  static create = catchAsync(async (req, res, next) => {
    const data = await FeedbackService.createFeedback(req.body);
    res.status(201).json({
      success: true,
      message: 'Cảm ơn bạn đã gửi đánh giá!',
      data,
    });
  });

  static getByOrder = catchAsync(async (req, res, next) => {
    const data = await FeedbackService.getFeedbackByOrder(req.params.orderId);
    res.status(200).json({
      success: true,
      data,
    });
  });

  static detail = catchAsync(async (req, res, next) => {
    const data = await FeedbackService.getFeedbackById(req.params.id);
    res.status(200).json({
      success: true,
      data,
    });
  });

  static search = catchAsync(async (req, res, next) => {
    const queryPayload = { ...req.query, ...req.body };
    const result = await FeedbackService.searchFeedbacks(queryPayload);
    res.status(200).json({
      success: true,
      isSuccess: true,
      message: 'Lấy danh sách đánh giá thành công',
      data: result.items,
      pagination: result.pagination,
      summary: result.summary,
    });
  });

  static update = catchAsync(async (req, res, next) => {
    const employeeId = req.user ? req.user._id : null;
    const data = await FeedbackService.updateFeedback(req.params.id, req.body, employeeId);
    res.status(200).json({
      success: true,
      isSuccess: true,
      message: 'Cập nhật đánh giá thành công',
      data,
    });
  });

  static exportExcel = catchAsync(async (req, res, next) => {
    const queryPayload = { ...req.query, ...req.body };
    await FeedbackService.exportFeedbacks(queryPayload, res);
  });
}

module.exports = FeedbackController;

