const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const FeedbackService = require('../services/feedback.service');

exports.search = catchAsync(async (req, res, next) => {
  const result = await FeedbackService.searchFeedbacks(req.body);
    res.status(200).json(result);
});;

exports.getById = catchAsync(async (req, res, next) => {
  const item = await FeedbackService.getFeedbackById(req.params.id);
    if (!item) {
      return next(new AppError(`Không tìm thấy đánh giá với ID: ${req.params.id}`, 404));
    }
    res.status(200).json({
      success: true,
      data: item,
      message: 'Lấy chi tiết đánh giá thành công'
    });
});;

exports.update = catchAsync(async (req, res, next) => {
  const id = req.body.id || req.body._id;
    if (!id) {
      return next(new AppError('Thiếu ID đánh giá cần cập nhật/trả lời', 400));
    }
    const employeeId = req.user ? req.user._id : null;
    const item = await FeedbackService.updateFeedback(id, req.body, employeeId);
    if (!item) {
      return next(new AppError(`Không tìm thấy đánh giá với ID: ${id}`, 404));
    }
    res.status(200).json({
      success: true,
      data: item,
      message: 'Cập nhật đánh giá thành công'
    });
});;

exports.exportFeedbacks = catchAsync(async (req, res, next) => {
  await FeedbackService.exportFeedbacks(req.body, res);
});;
