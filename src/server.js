const http = require('http');

const app = require('./app');
const connectDB = require('./db');
const { initCron } = require('./services/cron.service');
const { initSocket } = require('./services/socket.service');

const PORT = process.env.PORT || 5000;

// Kểm tra biến môi trường bắt buộc để chống Hardcode lỗi
const requiredEnvVars = ['MONGO_URI', 'JWT_SECRET', 'ACTIVATION_SECRET', 'FRONTEND_URL'];
const missingVars = requiredEnvVars.filter((envVar) => !process.env[envVar]);
if (missingVars.length > 0) {
  console.error(`\x1b[31m❌ [CRITICAL ERROR] Thiếu biến môi trường bắt buộc: ${missingVars.join(', ')}\x1b[0m`);
  process.exit(1);
}

const startServer = async () => {
  // Kết nối CSDL MongoDB
  await connectDB();

  const server = http.createServer(app);

  // Khởi tạo Socket.io
  initSocket(server);

  server.listen(PORT, () => {
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
