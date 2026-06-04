const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {});
    console.log(`\x1b[32m✔ [MongoDB] Connected successfully to host: ${conn.connection.host}\x1b[0m`);
  } catch (error) {
    console.error(`\x1b[31m✘ [MongoDB] Connection error: ${error.message}\x1b[0m`);
    process.exit(1);
  }
};

module.exports = connectDB;
