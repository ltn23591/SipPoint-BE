const catchAsync = require('../utils/catchAsync');
const ReportService = require('../services/report.service');

exports.dashboard = catchAsync(async (req, res, next) => {
  const data = await ReportService.getDashboardData();
    res.status(200).json({
      success: true,
      data,
      message: 'Lấy dữ liệu dashboard thành công'
    });
});;

exports.revenue = catchAsync(async (req, res, next) => {
  const data = await ReportService.getRevenueReport(req.query);
    res.status(200).json({
      success: true,
      data,
      message: 'Lấy báo cáo doanh thu thành công'
    });
});;

exports.topProducts = catchAsync(async (req, res, next) => {
  const data = await ReportService.getTopProducts(req.query);
    res.status(200).json({
      success: true,
      data,
      message: 'Lấy báo cáo sản phẩm bán chạy thành công'
    });
});;

exports.exportRevenue = catchAsync(async (req, res, next) => {
  await ReportService.exportRevenue(req.body, res);
});;

exports.exportOrders = catchAsync(async (req, res, next) => {
  await ReportService.exportOrders(req.body, res);
});;

exports.exportCustomers = catchAsync(async (req, res, next) => {
  await ReportService.exportCustomers(req.body, res);
});;

exports.exportShifts = catchAsync(async (req, res, next) => {
  await ReportService.exportShifts(req.body, res);
});;
