const MembershipTier = require('../models/membershipTier.model');
const MembershipProgramService = require('./membershipProgram.service');

class MembershipTierService {
  static async getTiersByProgramId(programId) {
    return await MembershipTier.find({ programId }).sort({ minPoints: 1 });
  }

  static async getCurrentProgramTiers() {
    const currentProgram = await MembershipProgramService.getCurrentProgram();
    if (!currentProgram) {
      return [];
    }
    return await MembershipTier.find({ programId: currentProgram._id }).sort({ minPoints: 1 });
  }

  static async searchTiers(payload) {
    const page = parseInt(payload.page || 1, 10);
    const limit = parseInt(payload.pageSize || payload.limit || 10, 10);
    const skip = (page - 1) * limit;
    const search = payload.search || payload.keyword || '';

    const filter = {};
    if (search) {
      filter.name = { $regex: search, $options: 'i' };
    }

    if (payload.programId) {
      filter.programId = payload.programId;
    }

    const items = await MembershipTier.find(filter)
      .populate('programId')
      .sort({ minPoints: 1 })
      .skip(skip)
      .limit(limit);

    const total = await MembershipTier.countDocuments(filter);

    return {
      status: 200,
      success: true,
      message: 'Tìm kiếm hạng thành viên thành công',
      data: items,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async getTierById(id) {
    return await MembershipTier.findById(id).populate('programId');
  }

  static async createTier(data) {
    if (!data.programId) {
      let currentProgram = await MembershipProgramService.getCurrentProgram();
      if (!currentProgram) {
        const MembershipProgram = require('../models/membershipProgram.model');
        currentProgram = await MembershipProgram.create({
          name: 'Chương trình Thành viên SipPoint',
          description: 'Chương trình tích điểm mặc định',
          status: 'active',
          isApproved: true,
        });
      }
      data.programId = currentProgram._id;
    }
    return await MembershipTier.create(data);
  }

  static async updateTier(id, data) {
    return await MembershipTier.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    });
  }
}

module.exports = MembershipTierService;
