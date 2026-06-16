const TableService = require('../services/table.service');
const { emitToAll } = require('../services/socket.service');

exports.getAll = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.zoneId) {
      filter.zoneId = req.query.zoneId;
    }
    const items = await TableService.getAll(filter);
    res.status(200).json({
      success: true,
      count: items.length,
      data: items,
      message: 'Lấy danh sách bàn thành công'
    });
  } catch (error) {
    next(error);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const item = await TableService.getById(req.params.id);
    if (!item) {
      res.status(404);
      throw new Error(`Không tìm thấy bàn với ID: ${req.params.id}`);
    }
    res.status(200).json({
      success: true,
      data: item,
      message: 'Lấy chi tiết bàn thành công'
    });
  } catch (error) {
    next(error);
  }
};

exports.create = async (req, res, next) => {
  try {
    const item = await TableService.create(req.body);
    
    // Emit real-time event for table creation
    emitToAll('table_created', item);

    res.status(201).json({
      success: true,
      data: item,
      message: 'Đã thêm bàn thành công'
    });
  } catch (error) {
    next(error);
  }
};

exports.update = async (req, res, next) => {
  try {
    const item = await TableService.update(req.params.id, req.body);
    if (!item) {
      res.status(404);
      throw new Error(`Không tìm thấy bàn với ID: ${req.params.id}`);
    }
    
    // Emit real-time event when table details or status changes
    emitToAll('table_updated', item);

    res.status(200).json({
      success: true,
      data: item,
      message: 'Cập nhật bàn thành công'
    });
  } catch (error) {
    next(error);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const item = await TableService.delete(req.params.id);
    if (!item) {
      res.status(404);
      throw new Error(`Không tìm thấy bàn với ID: ${req.params.id}`);
    }

    // Emit real-time event when table is deleted
    emitToAll('table_deleted', { id: req.params.id });

    res.status(200).json({ success: true, data: {}, message: 'Đã xóa bàn thành công' });
  } catch (error) {
    next(error);
  }
};

exports.generateQRCode = async (req, res, next) => {
  try {
    const item = await TableService.generateTableQRCode(req.params.id);
    res.status(200).json({ success: true, data: item, message: 'Đã tạo lại mã QR thành công' });
  } catch (error) {
    next(error);
  }
};
