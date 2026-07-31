const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const TableService = require('../services/table.service');
const { emitToAll } = require('../services/socket.service');

class TableController {
  static getAll = catchAsync(async (req, res, next) => {
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
});;

  static getById = catchAsync(async (req, res, next) => {
  const item = await TableService.getById(req.params.id);
    if (!item) {
      return next(new AppError(`Không tìm thấy bàn với ID: ${req.params.id}`, 404));
    }
    res.status(200).json({
      success: true,
      data: item,
      message: 'Lấy chi tiết bàn thành công'
    });
});;

  static create = catchAsync(async (req, res, next) => {
  const item = await TableService.create(req.body);
    
    // Emit real-time event for table creation
    emitToAll('table_created', item);

    res.status(201).json({
      success: true,
      data: item,
      message: 'Đã thêm bàn thành công'
    });
});;

  static update = catchAsync(async (req, res, next) => {
  const item = await TableService.update(req.params.id, req.body);
    if (!item) {
      return next(new AppError(`Không tìm thấy bàn với ID: ${req.params.id}`, 404));
    }
    
    // Emit real-time event when table details or status changes
    emitToAll('table_updated', item);

    res.status(200).json({
      success: true,
      data: item,
      message: 'Cập nhật bàn thành công'
    });
});;

  static remove = catchAsync(async (req, res, next) => {
  const item = await TableService.delete(req.params.id);
    if (!item) {
      return next(new AppError(`Không tìm thấy bàn với ID: ${req.params.id}`, 404));
    }

    // Emit real-time event when table is deleted
    emitToAll('table_deleted', { id: req.params.id });

    res.status(200).json({ success: true, data: {}, message: 'Đã xóa bàn thành công' });
});;

  static generateQRCode = catchAsync(async (req, res, next) => {
  const item = await TableService.generateTableQRCode(req.params.id);
    res.status(200).json({ success: true, data: item, message: 'Đã tạo lại mã QR thành công' });
});;

}

module.exports = TableController;
