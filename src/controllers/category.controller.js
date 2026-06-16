const CategoryService = require('../services/category.service');

exports.getAll = async (req, res, next) => {
  try {
    const items = await CategoryService.getAll();
    res.status(200).json({
      success: true,
      count: items.length,
      data: items,
      message: 'Lấy danh sách danh mục thành công'
    });
  } catch (error) {
    next(error);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const item = await CategoryService.getById(req.params.id);
    if (!item) {
      res.status(404);
      throw new Error(`Không tìm thấy danh mục với ID: ${req.params.id}`);
    }
    res.status(200).json({
      success: true,
      data: item,
      message: 'Lấy chi tiết danh mục thành công'
    });
  } catch (error) {
    next(error);
  }
};

exports.create = async (req, res, next) => {
  try {
    const item = await CategoryService.create(req.body);
    res.status(201).json({
      success: true,
      data: item,
      message: 'Đã thêm danh mục thành công'
    });
  } catch (error) {
    next(error);
  }
};

exports.update = async (req, res, next) => {
  try {
    const item = await CategoryService.update(req.params.id, req.body);
    if (!item) {
      res.status(404);
      throw new Error(`Không tìm thấy danh mục với ID: ${req.params.id}`);
    }
    res.status(200).json({
      success: true,
      data: item,
      message: 'Cập nhật danh mục thành công'
    });
  } catch (error) {
    next(error);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const item = await CategoryService.delete(req.params.id);
    if (!item) {
      res.status(404);
      throw new Error(`Không tìm thấy danh mục với ID: ${req.params.id}`);
    }
    res.status(200).json({
      success: true,
      data: {},
      message: 'Đã xóa danh mục thành công'
    });
  } catch (error) {
    next(error);
  }
};
