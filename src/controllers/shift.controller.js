const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const ShiftService = require('../services/shift.service');

exports.getAll = catchAsync(async (req, res, next) => {
  const items = await ShiftService.getAll();
    res.status(200).json({ success: true, count: items.length, data: items });
});;

exports.getById = catchAsync(async (req, res, next) => {
  const item = await ShiftService.getById(req.params.id);
    if (!item) {
      return next(new AppError(`Không tìm thấy shift với ID: ${req.params.id}`, 404));
    }
    res.status(200).json({ success: true, data: item });
});;

exports.open = catchAsync(async (req, res, next) => {
  const { employeeId, startingCash } = req.body;
    if (!employeeId) {
      return next(new AppError('Thiếu employeeId', 400));
    }
    const item = await ShiftService.openShift(employeeId, startingCash);
    res.status(201).json({ success: true, data: item, message: 'Mở ca làm việc thành công' });
});;

exports.close = catchAsync(async (req, res, next) => {
  const { actualEndingCash, note } = req.body;
    const item = await ShiftService.closeShift(req.params.id, actualEndingCash, note);
    res.status(200).json({ success: true, data: item, message: 'Đóng ca làm việc thành công' });
});;
