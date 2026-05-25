const app = require('../src/app');
const connectDB = require('../src/db');

// Kết nối database cho môi trường Serverless
connectDB();

module.exports = app;
