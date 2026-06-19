const StaffRole = require('../models/staffRole.model');

class StaffRoleService {
  static async getAllRoles() {
    return await StaffRole.find({}).sort({ createdAt: -1 });
  }

  static async createRole(data) {
    return await StaffRole.create(data);
  }

  static async updateRole(id, data) {
    return await StaffRole.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    });
  }
}

module.exports = StaffRoleService;
