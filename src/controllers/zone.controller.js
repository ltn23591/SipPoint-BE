const ZoneService = require('../services/zone.service');

exports.getAll = async (req, res, next) => {
  try {
    const items = await ZoneService.getAll();
    res.status(200).json({
      success: true,
      count: items.length,
      data: items,
      message: 'Lấy danh sách khu vực thành công'
    });
  } catch (error) {
    next(error);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const item = await ZoneService.getById(req.params.id);
    if (!item) {
      res.status(404);
      throw new Error(`Không tìm thấy khu vực với ID: ${req.params.id}`);
    }
    res.status(200).json({
      success: true,
      data: item,
      message: 'Lấy chi tiết khu vực thành công'
    });
  } catch (error) {
    next(error);
  }
};

exports.create = async (req, res, next) => {
  try {
    const item = await ZoneService.create(req.body);
    res.status(201).json({
      success: true,
      data: item,
      message: 'Đã thêm khu vực thành công'
    });
  } catch (error) {
    next(error);
  }
};

exports.update = async (req, res, next) => {
  try {
    const item = await ZoneService.update(req.params.id, req.body);
    if (!item) {
      res.status(404);
      throw new Error(`Không tìm thấy khu vực với ID: ${req.params.id}`);
    }
    res.status(200).json({
      success: true,
      data: item,
      message: 'Cập nhật khu vực thành công'
    });
  } catch (error) {
    next(error);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const item = await ZoneService.delete(req.params.id);
    if (!item) {
      res.status(404);
      throw new Error(`Không tìm thấy khu vực với ID: ${req.params.id}`);
    }
    res.status(200).json({
      success: true,
      data: {},
      message: 'Đã xóa khu vực thành công'
    });
  } catch (error) {
    next(error);
  }
};
