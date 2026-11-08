const Order = require('../models/order.model');
const { OrderItem } = require('../models/orderItem.model');
const Customer = require('../models/customer.model');
const StockMovement = require('../models/stockMovement.model');
const Material = require('../models/material.model');
const { ORDER_STATUS, IS_ACTIVE } = require('../enums');
const exceljs = require('exceljs');

const buildDateRange = (startDate, endDate) => {
  const range = {};
  if (startDate) {
    const start = new Date(startDate);
    if (/^\d{4}-\d{2}-\d{2}$/.test(String(startDate).trim())) {
      start.setHours(0, 0, 0, 0);
    }
    range.$gte = start;
  }
  if (endDate) {
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    range.$lte = end;
  }
  return range;
};

class ReportService {
  static async getDashboardData() {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const dateFilter = {
      createdAt: { $gte: startOfDay, $lte: endOfDay },
    };

    const totalRevenueResult = await Order.aggregate([
      {
        $match: {
          isActive: { $ne: IS_ACTIVE.FALSE },
          isPaid: true,
          status: ORDER_STATUS.COMPLETED,
          ...dateFilter,
        },
      },
      { $group: { _id: null, total: { $sum: '$total' } } },
    ]);
    const totalRevenue = totalRevenueResult[0]?.total || 0;

    const totalOrders = await Order.countDocuments({
      isActive: { $ne: IS_ACTIVE.FALSE },
      ...dateFilter,
    });
    const totalCustomers = await Customer.countDocuments(dateFilter);
    const recentOrders = await Order.find({
      isActive: { $ne: IS_ACTIVE.FALSE },
      ...dateFilter,
    })
      .populate('customerId tableId')
      .populate('items')
      .sort({ createdAt: -1 })
      .limit(5);

    return {
      totalRevenue,
      totalOrders,
      totalCustomers,
      recentOrders,
    };
  }

  static async getRevenueReport(query = {}) {
    const { startDate, endDate } = query;
    const filter = {
      isActive: { $ne: IS_ACTIVE.FALSE },
      isPaid: true,
      status: ORDER_STATUS.COMPLETED,
    };
    if (startDate || endDate) {
      filter.createdAt = buildDateRange(startDate, endDate);
    }

    const revenueData = await Order.aggregate([
      { $match: filter },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          revenue: { $sum: '$total' },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    return revenueData;
  }

  static async getTopProducts(query = {}) {
    const { startDate, endDate, limit = 5 } = query;

    // Lọc theo khoảng thời gian trên bảng orders
    const orderFilter = {
      isActive: { $ne: IS_ACTIVE.FALSE },
      status: ORDER_STATUS.COMPLETED,
    };
    if (startDate || endDate) {
      orderFilter.createdAt = buildDateRange(startDate, endDate);
    }

    // Lấy danh sách orderId từ orders đã COMPLETED
    const completedOrders = await Order.find(orderFilter).select('_id');
    const orderIds = completedOrders.map((o) => o._id);

    // Aggregate từ collection orderitems
    const topProducts = await OrderItem.aggregate([
      { $match: { orderId: { $in: orderIds } } },
      {
        $group: {
          _id: '$productId',
          name: { $first: '$name' },
          qty: { $sum: '$qty' },
          revenue: { $sum: '$subtotal' },
        },
      },
      { $sort: { qty: -1 } },
      { $limit: parseInt(limit, 10) },
    ]);

    return topProducts;
  }

  /**
   * Báo cáo tiêu hao nguyên liệu: tổng hợp biến động tồn kho theo từng nguyên liệu
   * trong khoảng thời gian, kèm tồn hiện tại và giá trị tồn.
   */
  static async getMaterialConsumption(query = {}) {
    const { startDate, endDate } = query;

    const match = {};
    if (startDate || endDate) {
      match.createdAt = buildDateRange(startDate, endDate);
    }

    const rows = await StockMovement.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$materialId',
          // Tổng nhập (biến động dương)
          imported: { $sum: { $cond: [{ $gt: ['$quantityChange', 0] }, '$quantityChange', 0] } },
          // Tổng tiêu hao / giảm (biến động âm, lấy trị tuyệt đối)
          consumed: { $sum: { $cond: [{ $lt: ['$quantityChange', 0] }, { $abs: '$quantityChange' }, 0] } },
          movementCount: { $sum: 1 },
        },
      },
      { $lookup: { from: 'materials', localField: '_id', foreignField: '_id', as: 'material' } },
      { $unwind: '$material' },
      {
        $project: {
          _id: 0,
          materialId: '$_id',
          name: '$material.name',
          unit: '$material.unit',
          onHand: '$material.onHand',
          cost: '$material.cost',
          status: '$material.status',
          imported: 1,
          consumed: 1,
          movementCount: 1,
          stockValue: { $multiply: ['$material.onHand', '$material.cost'] },
        },
      },
      { $sort: { consumed: -1 } },
    ]);

    return rows;
  }

  /**
   * Tổng quan tồn kho: số nguyên liệu, giá trị tồn, số sắp/hết hàng, danh sách cần nhập.
   */
  static async getInventoryDashboard() {
    const materials = await Material.find({ isDeleted: { $ne: true } }).lean();

    let stockValue = 0;
    let lowCount = 0;
    let outCount = 0;
    for (const m of materials) {
      stockValue += (m.onHand || 0) * (m.cost || 0);
      if (m.status === 'low') lowCount++;
      else if (m.status === 'out_of_stock') outCount++;
    }

    const lowStockList = materials
      .filter((m) => m.status === 'low' || m.status === 'out_of_stock')
      .sort((a, b) => (a.onHand || 0) - (b.onHand || 0))
      .slice(0, 20)
      .map((m) => ({
        _id: m._id,
        name: m.name,
        unit: m.unit,
        onHand: m.onHand,
        minThreshold: m.minThreshold,
        status: m.status,
      }));

    return {
      totalMaterials: materials.length,
      stockValue,
      lowCount,
      outCount,
      lowStockList,
    };
  }

  /**
   * Lượng tiêu hao nguyên liệu theo từng ngày (biến động giảm: CONSUME + điều chỉnh giảm).
   */
  static async getMaterialConsumptionSeries(query = {}) {
    const { startDate, endDate } = query;
    const match = {
      type: { $in: ['CONSUME', 'ADJUSTMENT'] },
      quantityChange: { $lt: 0 },
    };
    if (startDate || endDate) {
      match.createdAt = buildDateRange(startDate, endDate);
    }

    return await StockMovement.aggregate([
      { $match: match },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          consumed: { $sum: { $abs: '$quantityChange' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);
  }

  /**
   * Xuất Excel báo cáo tiêu hao nguyên liệu
   */
  static async exportMaterialConsumption(query, res) {
    const data = await this.getMaterialConsumption(query);
    const workbook = new exceljs.Workbook();
    const worksheet = workbook.addWorksheet('Material Consumption');

    worksheet.columns = [
      { header: 'Nguyên liệu', key: 'name', width: 25 },
      { header: 'Đơn vị', key: 'unit', width: 12 },
      { header: 'Đã nhập', key: 'imported', width: 15 },
      { header: 'Đã tiêu hao', key: 'consumed', width: 15 },
      { header: 'Tồn hiện tại', key: 'onHand', width: 15 },
      { header: 'Giá vốn/ĐV', key: 'cost', width: 15 },
      { header: 'Giá trị tồn', key: 'stockValue', width: 18 },
      { header: 'Trạng thái', key: 'status', width: 15 },
    ];

    data.forEach((item) => worksheet.addRow(item));

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=material-consumption.xlsx');
    await workbook.xlsx.write(res);
    res.end();
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

  static async exportOrders(query = {}, res) {
    const filter = { isActive: { $ne: IS_ACTIVE.FALSE } };
    if (query.startDate || query.endDate) {
      filter.createdAt = buildDateRange(query.startDate, query.endDate);
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
}

module.exports = ReportService;
