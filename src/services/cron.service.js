const cron = require('node-cron');

const initCron = () => {
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

module.exports = {
  initCron,
};
