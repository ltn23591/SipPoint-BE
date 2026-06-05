const app = require('./app');
const connectDB = require('./db');
const { initCron } = require('./services/cron.service');

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  // Kết nối CSDL MongoDB
  await connectDB();

  app.listen(PORT, () => {
    console.log(`\x1b[36m========================================================\x1b[0m`);
    console.log(`\x1b[32m🚀 [Server] Status: ONLINE\x1b[0m`);
    console.log(`\x1b[35m⚡ [Server] Mode  : ${process.env.NODE_ENV || 'development'}\x1b[0m`);
    console.log(`\x1b[34m🔗 [Server] URL   : http://localhost:${PORT}\x1b[0m`);
    console.log(`\x1b[33m📝 [Swagger] Docs : http://localhost:${PORT}/api-docs\x1b[0m`);
    console.log(`\x1b[36m========================================================\x1b[0m`);

    // Khởi tạo các tác vụ cron định kỳ
    initCron();
  });
};

startServer();
