const StoreService = require('../services/store.service');

exports.getAll = async (req, res, next) => {
  try {
    const items = await StoreService.getAllStores();
    res.status(200).json({
      success: true,
      count: items.length,
      data: items,
      message: 'Lấy danh sách cửa hàng thành công'
    });
  } catch (error) {
    next(error);
  }
};

exports.search = async (req, res, next) => {
  try {
    const result = await StoreService.searchStores(req.body);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const item = await StoreService.getStoreById(req.params.id);
    if (!item) {
      res.status(404);
      throw new Error(`Không tìm thấy cửa hàng với ID: ${req.params.id}`);
    }
    res.status(200).json({
      success: true,
      data: item,
      message: 'Lấy chi tiết cửa hàng thành công'
    });
  } catch (error) {
    next(error);
  }
};

exports.create = async (req, res, next) => {
  try {
    const item = await StoreService.createStore(req.body);
    res.status(201).json({
      success: true,
      data: item,
      message: 'Tạo cửa hàng thành công'
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
      throw new Error('Thiếu ID cửa hàng cần cập nhật');
    }
    const item = await StoreService.updateStore(id, req.body);
    if (!item) {
      res.status(404);
      throw new Error(`Không tìm thấy cửa hàng với ID: ${id}`);
    }
    res.status(200).json({
      success: true,
      data: item,
      message: 'Cập nhật cửa hàng thành công'
    });
  } catch (error) {
    next(error);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const item = await StoreService.deleteStore(req.params.id);
    if (!item) {
      res.status(404);
      throw new Error(`Không tìm thấy cửa hàng với ID: ${req.params.id}`);
    }
    res.status(200).json({
      success: true,
      data: {},
      message: 'Xóa cửa hàng thành công'
    });
  } catch (error) {
    next(error);
  }
};
