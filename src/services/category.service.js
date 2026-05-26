const Category = require('../models/category.model');

class CategoryService {
  static async getAll() {
    return await Category.find({});
  }

  static async getById(id) {
    return await Category.findById(id);
  }

  static async create(data) {
    return await Category.create(data); 
  }

  static async update(id, data) {
    return await Category.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    });
  }

  static async delete(id) {
    return await Category.findByIdAndDelete(id);
  }
}

module.exports = CategoryService;
