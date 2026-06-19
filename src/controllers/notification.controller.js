const NotificationService = require('../services/notification.service');

exports.search = async (req, res, next) => {
  try {
    const result = await NotificationService.searchNotifications(req.body);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const item = await NotificationService.getNotificationById(req.params.id);
    if (!item) {
      res.status(404);
      throw new Error(`Không tìm thấy thông báo với ID: ${req.params.id}`);
    }
    res.status(200).json({
      success: true,
      data: item,
      message: 'Lấy chi tiết thông báo thành công'
    });
  } catch (error) {
    next(error);
  }
};

exports.create = async (req, res, next) => {
  try {
    const employeeId = req.user ? req.user._id : null;
    const item = await NotificationService.createNotification(req.body, employeeId);
    res.status(201).json({
      success: true,
      data: item,
      message: 'Tạo thông báo thành công'
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
      throw new Error('Thiếu ID thông báo cần cập nhật');
    }
    const item = await NotificationService.updateNotification(id, req.body);
    if (!item) {
      res.status(404);
      throw new Error(`Không tìm thấy thông báo với ID: ${id}`);
    }
    res.status(200).json({
      success: true,
      data: item,
      message: 'Cập nhật thông báo thành công'
    });
  } catch (error) {
    next(error);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const item = await NotificationService.deleteNotification(req.params.id);
    if (!item) {
      res.status(404);
      throw new Error(`Không tìm thấy thông báo với ID: ${req.params.id}`);
    }
    res.status(200).json({
      success: true,
      data: {},
      message: 'Xóa thông báo thành công'
    });
  } catch (error) {
    next(error);
  }
};

exports.updateStatus = async (req, res, next) => {
  try {
    const id = req.body.id || req.body._id;
    if (!id) {
      res.status(400);
      throw new Error('Thiếu ID thông báo cần cập nhật trạng thái');
    }
    const item = await NotificationService.updateNotificationStatus(id, req.body);
    if (!item) {
      res.status(404);
      throw new Error(`Không tìm thấy thông báo với ID: ${id}`);
    }
    res.status(200).json({
      success: true,
      data: item,
      message: 'Cập nhật trạng thái thông báo thành công'
    });
  } catch (error) {
    next(error);
  }
};
