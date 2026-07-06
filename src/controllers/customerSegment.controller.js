const CustomerSegmentService = require('../services/customerSegment.service');

class CustomerSegmentController {
  static async create(req, res) {
    try {
      const createdById = req.user ? req.user._id : null;
      const result = await CustomerSegmentService.createSegment(req.body, createdById);
      res.status(result.status).json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async getAll(req, res) {
    try {
      const result = await CustomerSegmentService.getAllSegments(req.query);
      res.status(result.status).json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async getById(req, res) {
    try {
      const result = await CustomerSegmentService.getSegmentById(req.params.id);
      res.status(result.status).json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async update(req, res) {
    try {
      const result = await CustomerSegmentService.updateSegment(req.params.id, req.body);
      res.status(result.status).json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async remove(req, res) {
    try {
      const result = await CustomerSegmentService.deleteSegment(req.params.id);
      res.status(result.status).json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async preview(req, res) {
    try {
      const result = await CustomerSegmentService.previewSegment(req.body.criteria || req.body);
      res.status(result.status).json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async sync(req, res) {
    try {
      const result = await CustomerSegmentService.syncSegment(req.params.id);
      res.status(result.status).json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async getMembers(req, res) {
    try {
      const result = await CustomerSegmentService.getSegmentMembers(req.params.id, req.query);
      res.status(result.status).json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}

module.exports = CustomerSegmentController;
