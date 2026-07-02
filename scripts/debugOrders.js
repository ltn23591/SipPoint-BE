const mongoose = require('mongoose');
require('dotenv').config({ path: '../.env' }); // load dotenv
const Order = require('../src/models/order.model');
const Customer = require('../src/models/customer.model');

async function main() {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/node_express_base';
  await mongoose.connect(uri);
  console.log('Connected to DB');

  const orders = await Order.find({}).populate('customerId');
  console.log('Total orders in DB:', orders.length);
  orders.forEach(o => {
    console.log(`Order Code: ${o.code}, Customer: ${o.customerId ? o.customerId.fullName : 'None'}, CustomerId in Order: ${o.customerId ? o.customerId._id : 'None'}`);
  });

  const OrderService = require('../src/services/order.service');
  const result = await OrderService.getAllOrders({ customerId: '6a460ba868b2ddae1adf1371', limit: 50 });
  console.log('getAllOrders result:', JSON.stringify(result, null, 2));

  await mongoose.disconnect();
}

main().catch(console.error);
