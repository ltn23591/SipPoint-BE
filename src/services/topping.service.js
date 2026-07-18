const Topping = require('../models/topping.model');

class ToppingService {
  static async getAll() {
    return await Topping.find().sort({ createdAt: -1 });
  }

  static async getById(id) {
    return await Topping.findById(id);
  }

  static async create(data) {
    const topping = new Topping(data);
    return await topping.save();
  }

  static async update(id, data) {
    return await Topping.findByIdAndUpdate(id, data, { new: true });
  }

  static async delete(id) {
    return await Topping.findByIdAndDelete(id);
  }
}

module.exports = ToppingService;
