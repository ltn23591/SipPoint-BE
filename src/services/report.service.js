const Order = require('../models/order.model');
const Customer = require('../models/customer.model');
const Product = require('../models/product.model');
const exceljs = require('exceljs');

class ReportService {
  static async getDashboardData() {
    const totalRevenueResult = await Order.aggregate([
      { $match: { isPaid: true, status: 'COMPLETED' } },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]);
    const totalRevenue = totalRevenueResult[0]?.total || 0;

    const totalOrders = await Order.countDocuments();
    const totalCustomers = await Customer.countDocuments();
    const recentOrders = await Order.find()
      .populate('customerId tableId')
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
    const filter = { status: 'COMPLETED' };
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const topProducts = await Order.aggregate([
      { $match: filter },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.productId',
          name: { $first: '$items.name' },
          qty: { $sum: '$items.quantity' },
          revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } }
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
    const customers = await Customer.find({}).sort({ createdAt: -1 });
    const workbook = new exceljs.Workbook();
    const worksheet = workbook.addWorksheet('Customers Report');

    worksheet.columns = [
      { header: 'ID', key: 'customerId', width: 15 },
      { header: 'Họ tên', key: 'fullName', width: 25 },
      { header: 'SĐT', key: 'phone', width: 15 },
      { header: 'Hạng', key: 'tier', width: 15 },
      { header: 'Điểm tích lũy', key: 'currentPoints', width: 15 },
      { header: 'Tổng chi tiêu', key: 'totalSpent', width: 15 },
    ];

    customers.forEach(customer => worksheet.addRow(customer));

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=customers.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  }
}

module.exports = ReportService;
