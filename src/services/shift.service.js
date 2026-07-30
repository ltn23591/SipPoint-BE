const Shift = require('../models/shift.model');
const Order = require('../models/order.model');
const { SHIFT_STATUS } = require('../enums');
const AppError = require('../utils/AppError');

class ShiftService {
  static async getAll() {
    return await Shift.find({}).populate('employeeId', 'name email role').sort({ createdAt: -1 });
  }

  static async getById(id) {
    return await Shift.findById(id).populate('employeeId', 'name email role');
  }

  static async openShift(employeeId, startingCash = 0) {
    const existingShift = await Shift.findOne({ employeeId, status: SHIFT_STATUS.OPEN });
    if (existingShift) {
      throw new AppError('Bạn đang có một ca làm việc chưa đóng.', 400);
    }
    return await Shift.create({ employeeId, startingCash, status: SHIFT_STATUS.OPEN });
  }

  static async closeShift(id, actualEndingCash, note) {
    const shift = await Shift.findById(id);
    if (!shift) throw new AppError('Không tìm thấy ca làm việc.', 404);
    if (shift.status === SHIFT_STATUS.CLOSED) throw new AppError('Ca làm việc này đã được đóng.', 400);

    const endTime = new Date();

    const orders = await Order.find({
      isPaid: true,
      status: 'COMPLETED',
      createdAt: { $gte: shift.startTime, $lte: endTime }
    });

    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);
    const systemEndingCash = shift.startingCash + totalRevenue;

    shift.endTime = endTime;
    shift.actualEndingCash = actualEndingCash || 0;
    shift.systemEndingCash = systemEndingCash;
    shift.totalRevenue = totalRevenue;
    shift.totalOrders = totalOrders;
    shift.status = SHIFT_STATUS.CLOSED;
    if (note) shift.note = note;

    await shift.save();
    return shift;
  }
}

module.exports = ShiftService;
