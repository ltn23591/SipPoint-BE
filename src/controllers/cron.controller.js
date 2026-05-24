const CronService = require('../services/cron.service');
const logger = require('../config/logger');

class CronController {
  /**
   * Controller tiếp nhận request trigger cron
   */
  static async cleanup(req, res, next) {
    try {
      // Bảo mật endpoint cron:
      // Vercel tự động gửi Header Authorization với giá trị "Bearer <CRON_SECRET>"
      const authHeader = req.headers.authorization;
      
      if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        logger.warn('[Cron] Yêu cầu kích hoạt cron không hợp lệ do thiếu hoặc sai token.');
        return res.status(401).json({
          success: false,
          message: 'Unauthorized: Sai mã bảo mật Cron'
        });
      }

      const deletedCount = await CronService.cleanupExpiredUnverifiedUsers();
      return res.status(200).json({
        success: true,
        message: `Cron job chạy thành công. Đã xóa ${deletedCount} tài khoản hết hạn OTP.`,
        deletedCount
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = CronController;
