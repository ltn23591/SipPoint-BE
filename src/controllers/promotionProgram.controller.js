const PromotionProgramService = require('../services/promotionProgram.service');

exports.search = async (req, res, next) => {
  try {
    const result = await PromotionProgramService.searchPrograms(req.body);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const item = await PromotionProgramService.getProgramById(req.params.id);
    if (!item) {
      res.status(404);
      throw new Error(`Không tìm thấy chương trình khuyến mãi với ID: ${req.params.id}`);
    }
    res.status(200).json({
      success: true,
      data: item,
      message: 'Lấy chi tiết chương trình khuyến mãi thành công'
    });
  } catch (error) {
    next(error);
  }
};

exports.create = async (req, res, next) => {
  try {
    const employeeId = req.user ? req.user._id : null;
    const item = await PromotionProgramService.createProgram(req.body, employeeId);
    res.status(201).json({
      success: true,
      data: item,
      message: 'Tạo chương trình khuyến mãi thành công'
    });
  } catch (error) {
    next(error);
  }
};

exports.update = async (req, res, next) => {
  try {
    const id = req.body.id || req.body._id;
    if (!id) {
      res.status(400);
      throw new Error('Thiếu ID chương trình cần cập nhật');
    }
    const item = await PromotionProgramService.updateProgram(id, req.body);
    if (!item) {
      res.status(404);
      throw new Error(`Không tìm thấy chương trình khuyến mãi với ID: ${id}`);
    }
    res.status(200).json({
      success: true,
      data: item,
      message: 'Cập nhật chương trình khuyến mãi thành công'
    });
  } catch (error) {
    next(error);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const item = await PromotionProgramService.deleteProgram(req.params.id);
    if (!item) {
      res.status(404);
      throw new Error(`Không tìm thấy chương trình khuyến mãi với ID: ${req.params.id}`);
    }
    res.status(200).json({
      success: true,
      data: {},
      message: 'Xóa chương trình khuyến mãi thành công'
    });
  } catch (error) {
    next(error);
  }
};

exports.updateActive = async (req, res, next) => {
  try {
    const id = req.body.id || req.body._id;
    if (!id) {
      res.status(400);
      throw new Error('Thiếu ID chương trình cần cập nhật trạng thái');
    }
    const item = await PromotionProgramService.updateActive(id, req.body.isActive);
    if (!item) {
      res.status(404);
      throw new Error(`Không tìm thấy chương trình khuyến mãi với ID: ${id}`);
    }
    res.status(200).json({
      success: true,
      data: item,
      message: 'Cập nhật trạng thái hoạt động thành công'
    });
  } catch (error) {
    next(error);
  }
};

exports.approve = async (req, res, next) => {
  try {
    const id = req.body.id || req.body._id;
    if (!id) {
      res.status(400);
      throw new Error('Thiếu ID chương trình cần phê duyệt');
    }
    const employeeId = req.user ? req.user._id : null;
    const item = await PromotionProgramService.approveProgram(id, employeeId, req.body.isApproved);
    if (!item) {
      res.status(404);
      throw new Error(`Không tìm thấy chương trình khuyến mãi với ID: ${id}`);
    }
    res.status(200).json({
      success: true,
      data: item,
      message: 'Phê duyệt chương trình khuyến mãi thành công'
    });
  } catch (error) {
    next(error);
  }
};
