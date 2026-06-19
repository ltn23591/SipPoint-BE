const Store = require('../models/store.model');

class StoreService {
  static async getAllStores() {
    return await Store.find({}).sort({ createdAt: -1 });
  }

  static async searchStores(payload) {
    const page = parseInt(payload.page || 1, 10);
    const limit = parseInt(payload.pageSize || payload.limit || 10, 10);
    const skip = (page - 1) * limit;
    const search = payload.search || payload.keyword || '';

    const filter = {};
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { address: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    if (payload.isActive) {
      filter.isActive = payload.isActive;
    }

    const items = await Store.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Store.countDocuments(filter);

    return {
      status: 200,
      success: true,
      message: 'Tìm kiếm cửa hàng thành công',
      data: items,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async getStoreById(id) {
    return await Store.findById(id);
  }

  static async createStore(data) {
    return await Store.create(data);
  }

  static async updateStore(id, data) {
    return await Store.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    });
  }

  static async deleteStore(id) {
    return await Store.findByIdAndDelete(id);
  }
}

module.exports = StoreService;
