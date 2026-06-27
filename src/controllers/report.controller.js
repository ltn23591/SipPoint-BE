const ReportService = require('../services/report.service');

exports.dashboard = async (req, res, next) => {
  try {
    const data = await ReportService.getDashboardData();
    res.status(200).json({
      success: true,
      data,
      message: 'Lấy dữ liệu dashboard thành công'
    });
  } catch (error) {
    next(error);
  }
};

exports.revenue = async (req, res, next) => {
  try {
    const data = await ReportService.getRevenueReport(req.query);
    res.status(200).json({
      success: true,
      data,
      message: 'Lấy báo cáo doanh thu thành công'
    });
  } catch (error) {
    next(error);
  }
};

exports.topProducts = async (req, res, next) => {
  try {
    const data = await ReportService.getTopProducts(req.query);
    res.status(200).json({
      success: true,
      data,
      message: 'Lấy báo cáo sản phẩm bán chạy thành công'
    });
  } catch (error) {
    next(error);
  }
};

exports.exportRevenue = async (req, res, next) => {
  try {
    await ReportService.exportRevenue(req.body, res);
  } catch (error) {
    next(error);
  }
};

exports.exportOrders = async (req, res, next) => {
  try {
    await ReportService.exportOrders(req.body, res);
  } catch (error) {
    next(error);
  }
};

exports.exportCustomers = async (req, res, next) => {
  try {
    await ReportService.exportCustomers(req.body, res);
  } catch (error) {
    next(error);
  }
};

exports.exportShifts = async (req, res, next) => {
  try {
    await ReportService.exportShifts(req.body, res);
  } catch (error) {
    next(error);
  }
};
