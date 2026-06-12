const Zone = require('../models/zone.model');

class ZoneService {
  static async getAll() {
    return await Zone.find({});
  }

  static async getById(id) {
    return await Zone.findById(id);
  }

  static async create(data) {
    return await Zone.create(data);
  }

  static async update(id, data) {
    return await Zone.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    });
  }

  static async delete(id) {
    return await Zone.findByIdAndDelete(id);
  }
}

module.exports = ZoneService;
