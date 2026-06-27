const Order = require('../models/order.model');
const { OrderItem } = require('../models/orderItem.model');
const Customer = require('../models/customer.model');
const Product = require('../models/product.model');
const exceljs = require('exceljs');

class ReportService {
  static async getDashboardData() {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const dateFilter = {
      createdAt: { $gte: startOfDay, $lte: endOfDay }
    };

    const totalRevenueResult = await Order.aggregate([
      { $match: { isPaid: true, status: 'COMPLETED', ...dateFilter } },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]);
    const totalRevenue = totalRevenueResult[0]?.total || 0;

    const totalOrders = await Order.countDocuments(dateFilter);
    const totalCustomers = await Customer.countDocuments(dateFilter);
    const recentOrders = await Order.find(dateFilter)
      .populate('customerId tableId')
      .populate('items')
      .sort({ createdAt: -1 })
      .limit(5);

    return {
      totalRevenue,
      totalOrders,
      totalCustomers,
      recentOrders
    };
  }

  static async getRevenueReport(query) {
    const { startDate, endDate } = query;
    const filter = { isPaid: true, status: 'COMPLETED' };
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const revenueData = await Order.aggregate([
      { $match: filter },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          revenue: { $sum: '$total' },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    return revenueData;
  }

  static async getTopProducts(query) {
    const { startDate, endDate, limit = 5 } = query;

    // Lọc theo khoảng thời gian trên bảng orders
    const orderFilter = { status: 'COMPLETED' };
    if (startDate || endDate) {
      orderFilter.createdAt = {};
      if (startDate) orderFilter.createdAt.$gte = new Date(startDate);
      if (endDate) orderFilter.createdAt.$lte = new Date(endDate);
    }

    // Lấy danh sách orderId từ orders đã COMPLETED
    const completedOrders = await Order.find(orderFilter).select('_id');
    const orderIds = completedOrders.map(o => o._id);

    // Aggregate từ collection orderitems
    const topProducts = await OrderItem.aggregate([
      { $match: { orderId: { $in: orderIds } } },
      {
        $group: {
          _id: '$productId',
          name: { $first: '$name' },
          qty: { $sum: '$qty' },
          revenue: { $sum: '$subtotal' }
        }
      },
      { $sort: { qty: -1 } },
      { $limit: parseInt(limit, 10) }
    ]);

    return topProducts;
  }

  static async exportRevenue(query, res) {
    const data = await this.getRevenueReport(query);
    const workbook = new exceljs.Workbook();
    const worksheet = workbook.addWorksheet('Revenue Report');

    worksheet.columns = [
      { header: 'Ngày', key: '_id', width: 20 },
      { header: 'Doanh thu', key: 'revenue', width: 20 },
      { header: 'Số đơn hàng', key: 'count', width: 15 },
    ];

    data.forEach(item => worksheet.addRow(item));

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=revenue.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  }

  static async exportOrders(query, res) {
    const filter = {};
    if (query.startDate || query.endDate) {
      filter.createdAt = {};
      if (query.startDate) filter.createdAt.$gte = new Date(query.startDate);
      if (query.endDate) filter.createdAt.$lte = new Date(query.endDate);
    }

    const orders = await Order.find(filter).populate('customerId').sort({ createdAt: -1 });
    const workbook = new exceljs.Workbook();
    const worksheet = workbook.addWorksheet('Orders Report');

    worksheet.columns = [
      { header: 'Mã đơn', key: 'code', width: 15 },
      { header: 'Khách hàng', key: 'customerName', width: 25 },
      { header: 'Tổng tiền', key: 'total', width: 15 },
      { header: 'Trạng thái', key: 'status', width: 15 },
      { header: 'Thanh toán', key: 'isPaid', width: 15 },
      { header: 'Loại', key: 'type', width: 15 },
      { header: 'Ngày tạo', key: 'createdAt', width: 25 },
    ];

    orders.forEach(order => {
      worksheet.addRow({
        code: order.code,
        customerName: order.customerId ? (order.customerId.fullName || order.customerId.name) : 'Khách lẻ',
        total: order.total,
        status: order.status,
        isPaid: order.isPaid ? 'Đã thanh toán' : 'Chưa thanh toán',
        type: order.type,
        createdAt: order.createdAt,
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=orders.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  }

  static async exportCustomers(query, res) {
    const customers = await Customer.find({}).populate('tierId').sort({ createdAt: -1 });
    const workbook = new exceljs.Workbook();
    const worksheet = workbook.addWorksheet('Customers Report');

    worksheet.columns = [
      { header: 'ID', key: 'customerId', width: 15 },
      { header: 'Họ tên', key: 'fullName', width: 25 },
      { header: 'SĐT', key: 'phone', width: 15 },
      { header: 'Hạng thành viên', key: 'tierName', width: 20 },
      { header: 'Điểm tích lũy', key: 'currentPoints', width: 15 },
      { header: 'Tổng chi tiêu', key: 'totalSpent', width: 15 },
    ];

    customers.forEach(customer => {
      worksheet.addRow({
        customerId: customer.customerId,
        fullName: customer.fullName,
        phone: customer.phone,
        tierName: customer.tierId ? customer.tierId.name : 'Chưa phân hạng',
        currentPoints: customer.currentPoints,
        totalSpent: customer.totalSpent,
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=customers.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  }

  static async exportShifts(query, res) {
    const Shift = require('../models/shift.model');
    const filter = {};
    if (query.startDate || query.endDate) {
      filter.createdAt = {};
      if (query.startDate) filter.createdAt.$gte = new Date(query.startDate);
      if (query.endDate) filter.createdAt.$lte = new Date(query.endDate);
    }

    const shifts = await Shift.find(filter).populate('employeeId', 'name email role').sort({ createdAt: -1 });
    const workbook = new exceljs.Workbook();
    const worksheet = workbook.addWorksheet('Shifts Report');

    worksheet.columns = [
      { header: 'ID Ca', key: '_id', width: 25 },
      { header: 'Nhân viên', key: 'employeeName', width: 25 },
      { header: 'Bắt đầu', key: 'startTime', width: 25 },
      { header: 'Kết thúc', key: 'endTime', width: 25 },
      { header: 'Tiền mặt đầu ca', key: 'startingCash', width: 20 },
      { header: 'Tiền mặt thực tế (kết ca)', key: 'actualEndingCash', width: 25 },
      { header: 'Hệ thống tính (kết ca)', key: 'systemEndingCash', width: 25 },
      { header: 'Tổng doanh thu', key: 'totalRevenue', width: 20 },
      { header: 'Tổng đơn', key: 'totalOrders', width: 15 },
      { header: 'Trạng thái', key: 'status', width: 15 },
      { header: 'Ghi chú', key: 'note', width: 30 },
    ];

    shifts.forEach(shift => {
      worksheet.addRow({
        _id: shift._id.toString(),
        employeeName: shift.employeeId ? shift.employeeId.name : 'N/A',
        startTime: shift.startTime ? shift.startTime.toLocaleString() : '',
        endTime: shift.endTime ? shift.endTime.toLocaleString() : '',
        startingCash: shift.startingCash,
        actualEndingCash: shift.actualEndingCash,
        systemEndingCash: shift.systemEndingCash,
        totalRevenue: shift.totalRevenue,
        totalOrders: shift.totalOrders,
        status: shift.status,
        note: shift.note,
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=shifts.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  }
}

module.exports = ReportService;
