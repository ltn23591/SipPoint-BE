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

  static async updateConfig(data, employeeId) {
    const ActivityLogService = require('./activityLog.service');
    let config = await Store.findOne();
    let updated;
    if (!config) {
      updated = await Store.create(data);
    } else {
      updated = await Store.findByIdAndUpdate(config._id, data, {
        new: true,
        runValidators: true,
      });
    }

    if (data.paymentMethods) {
      ActivityLogService.logActivity(employeeId || null, 'UPDATE_PAYMENTS', 'Phương thức thanh toán', `Cấu hình phương thức thanh toán: ${data.paymentMethods.join(', ')}`);
    }

    return updated;
  }
}

module.exports = StoreService;
