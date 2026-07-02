const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {});
    console.log(`\x1b[32m✔ [MongoDB] Connected successfully to host: ${conn.connection.host}\x1b[0m`);
    
    try {
      await conn.connection.db.collection('orders').dropIndex('orderCode_1');
      console.log(`\x1b[32m✔ [MongoDB] Legacy orderCode_1 index dropped successfully\x1b[0m`);
    } catch (e) {
      // Ignore error if index does not exist
    }
  } catch (error) {
    console.error(`\x1b[31m✘ [MongoDB] Connection error: ${error.message}\x1b[0m`);
    process.exit(1);
  }
};

module.exports = connectDB;
