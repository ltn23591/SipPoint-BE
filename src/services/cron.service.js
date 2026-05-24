const User = require('../models/user.model');
const logger = require('../config/logger');

class CronService {
  /**
   * Dọn dẹp tài khoản chưa xác thực (isVerified = false) và OTP đã hết hạn
   * @returns {Promise<number>} Số lượng user đã bị xóa
   */
  static async cleanupExpiredUnverifiedUsers() {
    try {
      const now = new Date();
      // Tìm và xóa những user chưa kích hoạt và mã OTP xác thực đã hết hạn
      const result = await User.deleteMany({
        isVerified: false,
        verifyOTPExpire: { $lt: now }
      });
      logger.info(`[Cron] Đã dọn dẹp ${result.deletedCount} tài khoản chưa kích hoạt hết hạn OTP.`);
      return result.deletedCount;
    } catch (error) {
      logger.error('[Cron] Lỗi khi dọn dẹp tài khoản chưa kích hoạt:', error);
      throw error;
    }
  }
}

module.exports = CronService;
