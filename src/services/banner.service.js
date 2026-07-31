const Banner = require('../models/banner.model');
const { IS_ACTIVE } = require('../enums');

class BannerService {
  static async getAll(payload = {}) {
    const filter = {};
    if (payload.search) {
      filter.title = { $regex: payload.search, $options: 'i' };
    }
    const banners = await Banner.find(filter).sort({ order: 1, createdAt: -1 });
    return banners;
  }

  static async getPublicActive() {
    const banners = await Banner.find({ isActive: IS_ACTIVE.TRUE }).sort({ order: 1, createdAt: -1 });
    return banners;
  }

  static async create(data) {
    return await Banner.create(data);
  }

  static async update(id, data) {
    return await Banner.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  }

  static async delete(id) {
    return await Banner.findByIdAndDelete(id);
  }
}

module.exports = BannerService;
