const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const NotificationService = require('../services/notification.service');

exports.search = catchAsync(async (req, res, next) => {
  const result = await NotificationService.searchNotifications(req.body);
    res.status(200).json(result);
});;

exports.getById = catchAsync(async (req, res, next) => {
  const item = await NotificationService.getNotificationById(req.params.id);
    if (!item) {
      return next(new AppError(`Không tìm thấy thông báo với ID: ${req.params.id}`, 404));
    }
    res.status(200).json({
      success: true,
      data: item,
      message: 'Lấy chi tiết thông báo thành công'
    });
});;

exports.create = catchAsync(async (req, res, next) => {
  const employeeId = req.user ? req.user._id : null;
    const item = await NotificationService.createNotification(req.body, employeeId);
    res.status(201).json({
      success: true,
      data: item,
      message: 'Tạo thông báo thành công'
    });
});;

exports.update = catchAsync(async (req, res, next) => {
  const id = req.body.id || req.body._id;
    if (!id) {
      return next(new AppError('Thiếu ID thông báo cần cập nhật', 400));
    }
    const item = await NotificationService.updateNotification(id, req.body);
    if (!item) {
      return next(new AppError(`Không tìm thấy thông báo với ID: ${id}`, 404));
    }
    res.status(200).json({
      success: true,
      data: item,
      message: 'Cập nhật thông báo thành công'
    });
});;

exports.remove = catchAsync(async (req, res, next) => {
  const item = await NotificationService.deleteNotification(req.params.id);
    if (!item) {
      return next(new AppError(`Không tìm thấy thông báo với ID: ${req.params.id}`, 404));
    }
    res.status(200).json({
      success: true,
      data: {},
      message: 'Xóa thông báo thành công'
    });
});;

exports.updateStatus = catchAsync(async (req, res, next) => {
  const id = req.body.id || req.body._id;
    if (!id) {
      return next(new AppError('Thiếu ID thông báo cần cập nhật trạng thái', 400));
    }
    const item = await NotificationService.updateNotificationStatus(id, req.body);
    if (!item) {
      return next(new AppError(`Không tìm thấy thông báo với ID: ${id}`, 404));
    }
    res.status(200).json({
      success: true,
      data: item,
      message: 'Cập nhật trạng thái thông báo thành công'
    });
});;
