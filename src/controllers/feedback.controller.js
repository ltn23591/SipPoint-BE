const FeedbackService = require('../services/feedback.service');

exports.search = async (req, res, next) => {
  try {
    const result = await FeedbackService.searchFeedbacks(req.body);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const item = await FeedbackService.getFeedbackById(req.params.id);
    if (!item) {
      res.status(404);
      throw new Error(`Không tìm thấy đánh giá với ID: ${req.params.id}`);
    }
    res.status(200).json({
      success: true,
      data: item,
      message: 'Lấy chi tiết đánh giá thành công'
    });
  } catch (error) {
    next(error);
  }
};

exports.update = async (req, res, next) => {
  try {
    const id = req.body.id || req.body._id;
    if (!id) {
      res.status(400);
      throw new Error('Thiếu ID đánh giá cần cập nhật/trả lời');
    }
    const employeeId = req.user ? req.user._id : null;
    const item = await FeedbackService.updateFeedback(id, req.body, employeeId);
    if (!item) {
      res.status(404);
      throw new Error(`Không tìm thấy đánh giá với ID: ${id}`);
    }
    res.status(200).json({
      success: true,
      data: item,
      message: 'Cập nhật đánh giá thành công'
    });
  } catch (error) {
    next(error);
  }
};

exports.exportFeedbacks = async (req, res, next) => {
  try {
    await FeedbackService.exportFeedbacks(req.body, res);
  } catch (error) {
    next(error);
  }
};
