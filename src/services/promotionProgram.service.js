const PromotionProgram = require('../models/promotionProgram.model');

class PromotionProgramService {
  static async searchPrograms(payload) {
    const page = parseInt(payload.page || 1, 10);
    const limit = parseInt(payload.pageSize || payload.limit || 10, 10);
    const skip = (page - 1) * limit;
    const search = payload.search || payload.keyword || '';

    const filter = {};
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    if (payload.isActive) {
      filter.isActive = payload.isActive;
    }

    const items = await PromotionProgram.find(filter)
      .populate('approvedBy createdBy')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await PromotionProgram.countDocuments(filter);

    return {
      status: 200,
      success: true,
      message: 'Tìm kiếm chương trình khuyến mãi thành công',
      data: items,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async getProgramById(id) {
    return await PromotionProgram.findById(id).populate('approvedBy createdBy');
  }

  static async createProgram(data, employeeId) {
    if (employeeId) {
      data.createdBy = employeeId;
    }
    return await PromotionProgram.create(data);
  }

  static async updateProgram(id, data) {
    return await PromotionProgram.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    });
  }

  static async deleteProgram(id) {
    return await PromotionProgram.findByIdAndDelete(id);
  }

  static async updateActive(id, isActive) {
    return await PromotionProgram.findByIdAndUpdate(id, { isActive }, { new: true });
  }

  static async approveProgram(id, employeeId, isApproved) {
    return await PromotionProgram.findByIdAndUpdate(
      id,
      {
        isApproved: isApproved !== false,
        approvedBy: employeeId,
      },
      { new: true }
    );
  }
}

module.exports = PromotionProgramService;
