const Store = require('../models/store.model');

class StoreService {
  static async getConfig() {
    let config = await Store.findOne();
    if (!config) {
      config = await Store.create({
        name: 'Tên cửa hàng mặc định',
        address: 'Địa chỉ mặc định',
        phone: '0123456789',
      });
    }
    return config;
  }

  static async updateConfig(data) {
    let config = await Store.findOne();
    if (!config) {
      return await Store.create(data);
    }
    return await Store.findByIdAndUpdate(config._id, data, {
      new: true,
      runValidators: true,
    });
  }
}

module.exports = StoreService;
