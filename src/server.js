const app = require('./app');
const connectDB = require('./db');

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  // Kết nối CSDL MongoDB
  await connectDB();

  app.listen(PORT, () => {
    console.log(`=========================================`);
    console.log(`[Server] running in ${process.env.NODE_ENV || 'development'} mode`);
    console.log(`[Server] Access URL: http://localhost:${PORT}`);
    console.log(`=========================================`);
  });
};

startServer();
