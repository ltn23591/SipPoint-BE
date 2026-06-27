const ShiftService = require('../services/shift.service');

exports.getAll = async (req, res, next) => {
  try {
    const items = await ShiftService.getAll();
    res.status(200).json({ success: true, count: items.length, data: items });
  } catch (error) {
    next(error);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const item = await ShiftService.getById(req.params.id);
    if (!item) {
      res.status(404);
      throw new Error(`Không tìm thấy shift với ID: ${req.params.id}`);
    }
    res.status(200).json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
};

exports.open = async (req, res, next) => {
  try {
    const { employeeId, startingCash } = req.body;
    if (!employeeId) {
      res.status(400);
      throw new Error('Thiếu employeeId');
    }
    const item = await ShiftService.openShift(employeeId, startingCash);
    res.status(201).json({ success: true, data: item, message: 'Mở ca làm việc thành công' });
  } catch (error) {
    next(error);
  }
};

exports.close = async (req, res, next) => {
  try {
    const { actualEndingCash, note } = req.body;
    const item = await ShiftService.closeShift(req.params.id, actualEndingCash, note);
    res.status(200).json({ success: true, data: item, message: 'Đóng ca làm việc thành công' });
  } catch (error) {
    next(error);
  }
};
