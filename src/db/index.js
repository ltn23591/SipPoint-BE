const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {});
    console.log(`[MongoDB] Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`[MongoDB] Error: ${error.message}`);
    if (!process.env.VERCEL) {
      process.exit(1);
    } else {
      throw error;
    }
  }
};

module.exports = connectDB;
