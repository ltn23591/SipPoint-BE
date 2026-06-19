const MembershipProgramService = require('../services/membershipProgram.service');

exports.getCurrent = async (req, res, next) => {
  try {
    const item = await MembershipProgramService.getCurrentProgram();
    res.status(200).json({
      success: true,
      data: item,
      message: 'Lấy chương trình thành viên hiện tại thành công'
    });
  } catch (error) {
    next(error);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const item = await MembershipProgramService.getProgramById(req.params.id);
    if (!item) {
      res.status(404);
      throw new Error(`Không tìm thấy chương trình thành viên với ID: ${req.params.id}`);
    }
    res.status(200).json({
      success: true,
      data: item,
      message: 'Lấy chi tiết chương trình thành viên thành công'
    });
  } catch (error) {
    next(error);
  }
};

exports.create = async (req, res, next) => {
  try {
    const employeeId = req.user ? req.user._id : null;
    const item = await MembershipProgramService.createProgram(req.body, employeeId);
    res.status(201).json({
      success: true,
      data: item,
      message: 'Tạo chương trình thành viên thành công'
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
    const item = await MembershipProgramService.updateProgram(id, req.body);
    if (!item) {
      res.status(404);
      throw new Error(`Không tìm thấy chương trình thành viên với ID: ${id}`);
    }
    res.status(200).json({
      success: true,
      data: item,
      message: 'Cập nhật chương trình thành viên thành công'
    });
  } catch (error) {
    next(error);
  }
};

exports.search = async (req, res, next) => {
  try {
    const result = await MembershipProgramService.searchPrograms(req.body);
    res.status(200).json(result);
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
    const item = await MembershipProgramService.approveProgram(id, employeeId, req.body.isApproved);
    if (!item) {
      res.status(404);
      throw new Error(`Không tìm thấy chương trình thành viên với ID: ${id}`);
    }
    res.status(200).json({
      success: true,
      data: item,
      message: 'Phê duyệt chương trình thành viên thành công'
    });
  } catch (error) {
    next(error);
  }
};
