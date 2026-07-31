const Store = require('../models/store.model');

class StoreService {
  static async getConfig() {
    let config = await Store.findOne();
    if (!config) {
      config = await Store.create({
        name: 'SipPoint Coffee',
        address: 'Địa chỉ mặc định',
        phone: '0123456789',
        paymentMethods: ['CASH', 'TRANSFER'],
      });
    } else if (!config.paymentMethods || config.paymentMethods.length === 0) {
      config.paymentMethods = ['CASH', 'TRANSFER'];
      await config.save();
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
