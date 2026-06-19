const MembershipProgram = require('../models/membershipProgram.model');

class MembershipProgramService {
  static async getCurrentProgram() {
    // Find active and approved program, or fallback to the latest one
    let program = await MembershipProgram.findOne({ status: 'active', isApproved: true })
      .sort({ createdAt: -1 });
    if (!program) {
      program = await MembershipProgram.findOne({}).sort({ createdAt: -1 });
    }
    return program;
  }

  static async getProgramById(id) {
    return await MembershipProgram.findById(id).populate('approvedBy createdBy');
  }

  static async createProgram(data, employeeId) {
    if (employeeId) {
      data.createdBy = employeeId;
    }
    return await MembershipProgram.create(data);
  }

  static async updateProgram(id, data) {
    return await MembershipProgram.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    });
  }

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

    if (payload.status) {
      filter.status = payload.status;
    }

    const items = await MembershipProgram.find(filter)
      .populate('approvedBy createdBy')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await MembershipProgram.countDocuments(filter);

    return {
      status: 200,
      success: true,
      message: 'Tìm kiếm chương trình thành viên thành công',
      data: items,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async approveProgram(id, employeeId, isApproved) {
    return await MembershipProgram.findByIdAndUpdate(
      id,
      {
        isApproved: isApproved !== false,
        approvedBy: employeeId,
      },
      { new: true }
    );
  }
}

module.exports = MembershipProgramService;
