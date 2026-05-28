require('dotenv').config();
const mongoose = require('mongoose');
const CustomerRank = require('../src/models/customerRank.model');
const Customer = require('../src/models/customer.model');
const PointHistory = require('../src/models/pointHistory.model');
const CustomerVoucher = require('../src/models/customerVoucher.model');

const seedData = async () => {
  try {
    // 1. Kết nối MongoDB
    if (!process.env.MONGO_URI) {
      throw new Error('Vui lòng cung cấp MONGO_URI trong file .env');
    }
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Đã kết nối MongoDB thành công.');

    // 2. Xóa dữ liệu cũ (Tùy chọn, comment lại nếu không muốn xóa data hiện tại)
    await CustomerRank.deleteMany({});
    await Customer.deleteMany({});
    await PointHistory.deleteMany({});
    await CustomerVoucher.deleteMany({});
    console.log('🗑 Đã xóa toàn bộ dữ liệu Customer cũ.');

    // 3. Tạo dữ liệu Mức hạng (Ranks)
    await CustomerRank.insertMany([
      { name: 'ĐỒNG', minSpent: 0, description: 'Hạng mặc định khi đăng ký' },
      { name: 'BẠC', minSpent: 5000000, description: 'Chi tiêu từ 5 triệu' },
      { name: 'VÀNG', minSpent: 20000000, description: 'Chi tiêu từ 20 triệu' },
      { name: 'KIM CƯƠNG', minSpent: 50000000, description: 'Chi tiêu từ 50 triệu' },
    ]);
    console.log('✨ Đã tạo dữ liệu Customer Ranks.');

    // 4. Tạo dữ liệu Khách hàng giống Mockup UI với mã số 8 chữ số
    const customers = [
      {
        customerId: '18239012',
        fullName: 'Nguyễn Thu Hà',
        email: 'ha.nguyen@email.com',
        phone: '0982123456',
        avatar: 'https://i.pravatar.cc/150?img=1',
        tier: 'KIM CƯƠNG',
        currentPoints: 12450,
        totalSpent: 65000000,
        dateOfBirth: new Date('1995-08-15'),
      },
      {
        customerId: '81726354',
        fullName: 'Trần Minh Quân',
        email: 'quan.tm@email.com',
        phone: '0912888999',
        avatar: 'https://i.pravatar.cc/150?img=11',
        tier: 'VÀNG',
        currentPoints: 4200,
        totalSpent: 25000000,
      },
      {
        customerId: '39485761',
        fullName: 'Lê Hồng Phong',
        email: 'phong.lh@email.com',
        phone: '0903456789',
        avatar: '', // Tự động hiển thị LP trên FE
        tier: 'BẠC',
        currentPoints: 800,
        totalSpent: 7500000,
      },
      {
        customerId: '52839401',
        fullName: 'Phạm Mỹ Linh',
        email: 'linh.pm@email.com',
        phone: '0356777888',
        avatar: 'https://i.pravatar.cc/150?img=5',
        tier: 'ĐỒNG',
        currentPoints: 120,
        totalSpent: 1500000,
      }
    ];

    const insertedCustomers = await Customer.insertMany(customers);
    console.log('👥 Đã tạo dữ liệu Khách hàng.');

    // 5. Tạo dữ liệu Lịch sử điểm cho khách hàng đầu tiên (Nguyễn Thu Hà)
    await PointHistory.insertMany([
      {
        customerId: insertedCustomers[0]._id,
        title: 'Đơn hàng #3920',
        description: 'Hôm nay, 10:24 • Thanh toán tại quầy',
        pointsChange: 150,
        transactionType: 'ORDER'
      },
      {
        customerId: insertedCustomers[0]._id,
        title: 'Đổi ưu đãi: Free Topping',
        description: '12/10/2023 • Mobile App',
        pointsChange: -200,
        transactionType: 'REWARD'
      },
      {
        customerId: insertedCustomers[0]._id,
        title: 'Thưởng sinh nhật',
        description: '15/08/2023 • Quà tặng hệ thống',
        pointsChange: 500,
        transactionType: 'BIRTHDAY_GIFT'
      }
    ]);
    console.log('📜 Đã tạo dữ liệu Lịch sử tích điểm.');

    // 6. Tạo dữ liệu Voucher mẫu cho khách hàng đầu tiên
    await CustomerVoucher.insertMany([
      {
        customerId: insertedCustomers[0]._id,
        title: 'Giảm 20% tổng hóa đơn',
        expiryDate: new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000), // Hết hạn sau 7 ngày
        isUsed: false
      },
      {
        customerId: insertedCustomers[0]._id,
        title: 'Miễn phí Trà Đào Cam Sả',
        expiryDate: new Date(new Date().getTime() + 14 * 24 * 60 * 60 * 1000), // Hết hạn sau 14 ngày
        isUsed: false
      }
    ]);
    console.log('🎟 Đã tạo dữ liệu Voucher.');

    console.log('🎉 Seeding hoàn tất thành công!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Lỗi khi seed data:', error);
    process.exit(1);
  }
};

seedData();
