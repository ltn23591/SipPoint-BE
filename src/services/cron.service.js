const cron = require('node-cron');
const CustomerService = require('./customer.service');
const CustomerSegmentService = require('./customerSegment.service');
const CampaignService = require('./campaign.service');
const GameService = require('./game.service');
const MaterialService = require('./material.service');
const NotificationService = require('./notification.service');
const { emitToAll } = require('./socket.service');

// Job nghiệp vụ 00:00 hằng ngày (giờ VN): duy trì / hạ hạng thành viên hết chu kỳ
const scheduleDailyJobs = () => {
  cron.schedule(
    '0 0 * * *',
    async () => {
      // Lazy-require để tránh vòng lặp require khi khởi động
      try {
        const result = await CustomerService.processTierExpirations();
        console.log(`✅ [Cron] Tier expiration check done. Processed: ${result.processed} customer(s)`);
      } catch (error) {
        console.error('❌ [Cron] Error during daily tier expiration job:', error.message);
      }

      try {
        const result = await CustomerSegmentService.syncAllSegments();
        console.log(`✅ [Cron] Segment sync done. Synced: ${result.synced} segment(s)`);
      } catch (error) {
        console.error('❌ [Cron] Error during daily segment sync job:', error.message);
      }

      try {
        const result = await CampaignService.finishExpiredCampaigns();
        console.log(`✅ [Cron] Campaign expiration check done. Finished: ${result.finished} campaign(s)`);
      } catch (error) {
        console.error('❌ [Cron] Error during daily campaign expiration job:', error.message);
      }

      try {
        const count = await scanLowStockMaterials();
        console.log(`✅ [Cron] Inventory scan done. Low/out-of-stock material(s): ${count}`);
      } catch (error) {
        console.error('❌ [Cron] Error during daily inventory scan job:', error.message);
      }

      try {
        const result = await GameService.expireEndedGames();
        console.log(`✅ [Cron] Lucky game expiration check done. Expired: ${result.expired} game(s)`);
      } catch (error) {
        console.error('❌ [Cron] Error during daily lucky game expiration job:', error.message);
      }
    },
    { timezone: 'Asia/Ho_Chi_Minh' }
  );

  console.log('⏱️ [Cron] Daily jobs scheduled at 00:00 (Asia/Ho_Chi_Minh)');
};

// Quét nguyên liệu sắp hết / đã hết và gửi một thông báo tổng hợp cho nhân viên
const scanLowStockMaterials = async () => {
  const materials = await MaterialService.getLowStockMaterials();
  if (!materials || materials.length === 0) return 0;

  const lines = materials.map(
    (m) => `- ${m.name}: còn ${m.onHand} ${m.unit} (ngưỡng ${m.minThreshold})`
  );
  const content = `Có ${materials.length} nguyên liệu sắp hết/đã hết cần nhập thêm:\n${lines.join('\n')}`;

  try {
    await NotificationService.createNotification({
      title: `Cảnh báo tồn kho: ${materials.length} nguyên liệu cần nhập thêm`,
      content,
      type: 'inventory',
      recipientType: 'staff',
    });
  } catch (error) {
    console.error('❌ [Cron] Lỗi lưu thông báo tổng hợp tồn kho:', error.message);
  }

  emitToAll('low_stock_digest', {
    count: materials.length,
    materials: materials.map((m) => ({
      materialId: m._id,
      name: m.name,
      unit: m.unit,
      onHand: m.onHand,
      minThreshold: m.minThreshold,
      status: m.status,
    })),
  });

  return materials.length;
};

const scheduleSelfPing = () => {
  const serverUrl = process.env.RENDER_EXTERNAL_URL || process.env.SERVER_URL;

  if (!serverUrl) {
    console.log('⚠️ [Cron] No RENDER_EXTERNAL_URL or SERVER_URL found. Skipping self-ping task.');
    return;
  }

  console.log(`⏱️ [Cron] Self-ping scheduled for url: ${serverUrl} every 5 minutes`);

  // Run every 5 minutes: '*/5 * * * *'
  cron.schedule('*/5 * * * *', async () => {
    try {
      console.log(`📡 [Cron] Sending self-ping to ${serverUrl} at ${new Date().toISOString()}`);

      const response = await fetch(serverUrl);

      if (response.ok) {
        console.log(`✅ [Cron] Self-ping successful: ${response.status}`);
      } else {
        console.log(`❌ [Cron] Self-ping failed with status: ${response.status}`);
      }
    } catch (error) {
      console.error('❌ [Cron] Error during self-ping request:', error.message);
    }
  });
};

const initCron = () => {
  scheduleDailyJobs();
  scheduleSelfPing();
};

module.exports = {
  initCron,
};
