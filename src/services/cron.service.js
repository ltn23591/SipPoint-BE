const cron = require('node-cron');

// Job nghiệp vụ 00:00 hằng ngày (giờ VN): duy trì / hạ hạng thành viên hết chu kỳ
const scheduleDailyJobs = () => {
  cron.schedule(
    '0 0 * * *',
    async () => {
      // Lazy-require để tránh vòng lặp require khi khởi động
      try {
        const CustomerService = require('./customer.service');
        const result = await CustomerService.processTierExpirations();
        console.log(`✅ [Cron] Tier expiration check done. Processed: ${result.processed} customer(s)`);
      } catch (error) {
        console.error('❌ [Cron] Error during daily tier expiration job:', error.message);
      }

      try {
        const CustomerSegmentService = require('./customerSegment.service');
        const result = await CustomerSegmentService.syncAllSegments();
        console.log(`✅ [Cron] Segment sync done. Synced: ${result.synced} segment(s)`);
      } catch (error) {
        console.error('❌ [Cron] Error during daily segment sync job:', error.message);
      }

      try {
        const CampaignService = require('./campaign.service');
        const result = await CampaignService.finishExpiredCampaigns();
        console.log(`✅ [Cron] Campaign expiration check done. Finished: ${result.finished} campaign(s)`);
      } catch (error) {
        console.error('❌ [Cron] Error during daily campaign expiration job:', error.message);
      }
    },
    { timezone: 'Asia/Ho_Chi_Minh' }
  );

  console.log('⏱️ [Cron] Daily jobs scheduled at 00:00 (Asia/Ho_Chi_Minh)');
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
