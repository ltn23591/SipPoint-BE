const catchAsync = require('../utils/catchAsync');
const CustomerSegmentService = require('../services/customerSegment.service');

class CustomerSegmentController {
  static create = catchAsync(async (req, res, next) => {
      const createdById = req.user ? req.user._id : null;
      const result = await CustomerSegmentService.createSegment(req.body, createdById);
      res.status(result.status || 200).json(result);
    });

  static getAll = catchAsync(async (req, res, next) => {
      const result = await CustomerSegmentService.getAllSegments(req.query);
      res.status(result.status || 200).json(result);
    });

  static getById = catchAsync(async (req, res, next) => {
      const result = await CustomerSegmentService.getSegmentById(req.params.id);
      res.status(result.status || 200).json(result);
    });

  static update = catchAsync(async (req, res, next) => {
      const result = await CustomerSegmentService.updateSegment(req.params.id, req.body);
      res.status(result.status || 200).json(result);
    });

  static remove = catchAsync(async (req, res, next) => {
      const result = await CustomerSegmentService.deleteSegment(req.params.id);
      res.status(result.status || 200).json(result);
    });

  static preview = catchAsync(async (req, res, next) => {
      const criteria = req.body.criteria || req.body;
      const query = { page: req.body.page, limit: req.body.limit };
      const result = await CustomerSegmentService.previewSegment(criteria, query);
      res.status(result.status || 200).json(result);
    });

  static sync = catchAsync(async (req, res, next) => {
      const result = await CustomerSegmentService.syncSegment(req.params.id);
      res.status(result.status || 200).json(result);
    });

  static toggleActive = catchAsync(async (req, res, next) => {
      const result = await CustomerSegmentService.toggleActive(req.params.id);
      res.status(result.status || 200).json(result);
    });

  static getMembers = catchAsync(async (req, res, next) => {
      const result = await CustomerSegmentService.getSegmentMembers(req.params.id, req.query);
      res.status(result.status || 200).json(result);
    });
}

module.exports = CustomerSegmentController;
