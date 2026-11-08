const Store = require('../models/store.model');

const ALLOWED_STORE_FIELDS = [
  'name',
  'address',
  'phone',
  'email',
  'description',
  'taxCode',
  'vatRate',
  'priceIncludesVat',
  'currency',
  'timezone',
  'wifiName',
  'wifiPassword',
  'operatingHours',
  'paymentMethods',
];

class StoreService {
  static async getConfig() {
    let config = await Store.findOne();
    if (!config) {
      config = await Store.create({
        name: 'SipPoint Coffee',
        address: '123 Đường Cà Phê, Quận 1, TP.HCM',
        phone: '0123456789',
        taxCode: '',
        vatRate: 0.1,
        priceIncludesVat: true,
        currency: 'VND',
        timezone: 'Asia/Ho_Chi_Minh',
        wifiName: 'SipPoint_Guest',
        wifiPassword: 'sippoint888',
        operatingHours: {
          monFriOpen: '07:00',
          monFriClose: '22:00',
          satSunOpen: '07:30',
          satSunClose: '23:00',
        },
        paymentMethods: ['CASH', 'TRANSFER'],
      });
    } else if (!config.paymentMethods || config.paymentMethods.length === 0) {
      config.paymentMethods = ['CASH', 'TRANSFER'];
      await config.save();
    }
    return config;
  }

  static async updateConfig(data = {}, employeeId) {
    const ActivityLogService = require('./activityLog.service');
    const payload = {};
    for (const key of ALLOWED_STORE_FIELDS) {
      if (data[key] !== undefined) {
        payload[key] = data[key];
      }
    }

    let config = await Store.findOne();
    let updated;
    if (!config) {
      updated = await Store.create(payload);
    } else {
      updated = await Store.findByIdAndUpdate(config._id, payload, {
        new: true,
        runValidators: true,
      });
    }

    if (employeeId) {
      if (payload.paymentMethods) {
        ActivityLogService.logActivity(
          employeeId,
          'UPDATE_PAYMENTS',
          'Phương thức thanh toán',
          `Cấu hình phương thức thanh toán: ${payload.paymentMethods.join(', ')}`
        );
      }
      const hasStoreSettingsChange = Object.keys(payload).some((k) => k !== 'paymentMethods');
      if (hasStoreSettingsChange) {
        ActivityLogService.logActivity(
          employeeId,
          'UPDATE_STORE',
          'Cấu hình cửa hàng',
          `Cập nhật thông tin cài đặt cửa hàng: ${updated?.name || ''}`
        );
      }
    }

    return updated;
  }
}

module.exports = StoreService;
