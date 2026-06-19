const MembershipTierService = require('../services/membershipTier.service');

exports.getByProgramId = async (req, res, next) => {
  try {
    const items = await MembershipTierService.getTiersByProgramId(req.params.programId);
    res.status(200).json({
      success: true,
      count: items.length,
      data: items,
      message: 'Lấy danh sách hạng thành viên thành công'
    });
  } catch (error) {
    next(error);
  }
};

exports.getCurrentTiers = async (req, res, next) => {
  try {
    const items = await MembershipTierService.getCurrentProgramTiers();
    res.status(200).json({
      success: true,
      count: items.length,
      data: items,
      message: 'Lấy hạng thành viên chương trình hiện tại thành công'
    });
  } catch (error) {
    next(error);
  }
};

exports.search = async (req, res, next) => {
  try {
    const result = await MembershipTierService.searchTiers(req.body);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

exports.create = async (req, res, next) => {
  try {
    const item = await MembershipTierService.createTier(req.body);
    res.status(201).json({
      success: true,
      data: item,
      message: 'Tạo hạng thành viên thành công'
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
      throw new Error('Thiếu ID hạng thành viên cần cập nhật');
    }
    const item = await MembershipTierService.updateTier(id, req.body);
    if (!item) {
      res.status(404);
      throw new Error(`Không tìm thấy hạng thành viên với ID: ${id}`);
    }
    res.status(200).json({
      success: true,
      data: item,
      message: 'Cập nhật hạng thành viên thành công'
    });
  } catch (error) {
    next(error);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const item = await MembershipTierService.getTierById(req.params.id);
    if (!item) {
      res.status(404);
      throw new Error(`Không tìm thấy hạng thành viên với ID: ${req.params.id}`);
    }
    res.status(200).json({
      success: true,
      data: item,
      message: 'Lấy chi tiết hạng thành viên thành công'
    });
  } catch (error) {
    next(error);
  }
};
