const catchAsync = require('../utils/catchAsync');
const CustomerSegmentService = require('../services/customerSegment.service');

class CustomerSegmentController {
  static create = catchAsync(async (req, res, next) => {
    const createdById = req.user ? req.user._id : null;
    const data = await CustomerSegmentService.createSegment(req.body, createdById);
    res.status(201).json({
      success: true,
      message: 'Tạo nhóm khách hàng thành công',
      data,
    });
  });

  static getAll = catchAsync(async (req, res, next) => {
    const result = await CustomerSegmentService.getAllSegments(req.query);
    res.status(200).json({
      success: true,
      message: 'Lấy danh sách nhóm khách hàng thành công',
      data: result.segments,
      pagination: result.pagination,
    });
  });

  static getById = catchAsync(async (req, res, next) => {
    const data = await CustomerSegmentService.getSegmentById(req.params.id);
    res.status(200).json({
      success: true,
      message: 'Lấy chi tiết nhóm khách hàng thành công',
      data,
    });
  });

  static update = catchAsync(async (req, res, next) => {
    const data = await CustomerSegmentService.updateSegment(req.params.id, req.body);
    res.status(200).json({
      success: true,
      message: 'Cập nhật nhóm khách hàng thành công',
      data,
    });
  });

  static remove = catchAsync(async (req, res, next) => {
    const data = await CustomerSegmentService.deleteSegment(req.params.id);
    res.status(200).json({
      success: true,
      data,
      message: 'Xóa nhóm khách hàng thành công',
    });
  });

  static preview = catchAsync(async (req, res, next) => {
    const criteria = req.body.criteria || req.body;
    const query = { page: req.body.page, limit: req.body.limit };
    const result = await CustomerSegmentService.previewSegment(criteria, query);
    res.status(200).json({
      success: true,
      message: `Có ${result.count.toLocaleString('vi-VN')} khách hàng phù hợp`,
      data: { count: result.count, members: result.members },
      pagination: result.pagination,
    });
  });

  static sync = catchAsync(async (req, res, next) => {
    const data = await CustomerSegmentService.syncSegment(req.params.id);
    res.status(200).json({
      success: true,
      message: 'Đồng bộ nhóm khách hàng thành công',
      data,
    });
  });

  static toggleActive = catchAsync(async (req, res, next) => {
    const data = await CustomerSegmentService.toggleActive(req.params.id);
    res.status(200).json({
      success: true,
      message: data.isActive ? 'Đã kích hoạt nhóm' : 'Đã tạm ngưng nhóm',
      data,
    });
  });

  static getMembers = catchAsync(async (req, res, next) => {
    const result = await CustomerSegmentService.getSegmentMembers(req.params.id, req.query);
    res.status(200).json({
      success: true,
      message: 'Lấy danh sách thành viên nhóm thành công',
      data: result.members,
      pagination: result.pagination,
    });
  });
}

module.exports = CustomerSegmentController;
