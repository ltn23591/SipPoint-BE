require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const Customer = require('../src/models/customer.model');
const PointHistory = require('../src/models/pointHistory.model');
const CustomerVoucher = require('../src/models/customerVoucher.model');
const Category = require('../src/models/category.model');
const Product = require('../src/models/product.model');
const ProductVariant = require('../src/models/productVariant.model');
const Store = require('../src/models/store.model');
const StaffRole = require('../src/models/staffRole.model');
const ProductPrice = require('../src/models/productPrice.model');
const MembershipProgram = require('../src/models/membershipProgram.model');
const MembershipTier = require('../src/models/membershipTier.model');
const PromotionProgram = require('../src/models/promotionProgram.model');
const Notification = require('../src/models/notification.model');
const Feedback = require('../src/models/feedback.model');
const ActivityLog = require('../src/models/activityLog.model');
const Employee = require('../src/models/employee.model');
const Voucher = require('../src/models/voucher.model');

const seedData = async () => {
  try {
    // 1. Kết nối MongoDB
    if (!process.env.MONGO_URI) {
      throw new Error('Vui lòng cung cấp MONGO_URI trong file .env');
    }
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Đã kết nối MongoDB thành công.');

    // 2. Xóa dữ liệu cũ
    await Customer.deleteMany({});
    await PointHistory.deleteMany({});
    await CustomerVoucher.deleteMany({});
    await Category.deleteMany({});
    await Product.deleteMany({});
    await ProductVariant.deleteMany({});
    await Store.deleteMany({});
    await StaffRole.deleteMany({});
    await ProductPrice.deleteMany({});
    await MembershipProgram.deleteMany({});
    await MembershipTier.deleteMany({});
    await PromotionProgram.deleteMany({});
    await Notification.deleteMany({});
    await Feedback.deleteMany({});
    await ActivityLog.deleteMany({});
    await Employee.deleteMany({});
    await Voucher.deleteMany({});
    console.log('🗑 Đã xóa toàn bộ dữ liệu cũ.');

    // 3. Tạo dữ liệu Staff Roles
    const staffRolesData = [
      {
        name: 'Quản trị viên',
        code: 'admin',
        permissions: ['manage_store', 'manage_staff', 'view_reports', 'manage_products'],
        description: 'Toàn quyền quản trị hệ thống'
      }
    ];
    const insertedRoles = await StaffRole.insertMany(staffRolesData);
    const adminRoleId = insertedRoles[0]._id;
    console.log('⚙️ Đã tạo dữ liệu Vai trò Nhân viên.');

    // 4. Tạo nhân viên Admin mặc định
    const adminPassword = await bcrypt.hash('password123', 10);
    const adminEmployee = await Employee.create({
      name: 'Admin Manager',
      email: 'admin@sippoint.com',
      password: adminPassword,
      roleId: adminRoleId,
      status: 'active'
    });
    console.log('👤 Đã tạo nhân viên Admin mặc định.');

    // 4. Tạo dữ liệu Membership Program & Tiers
    const membershipProgram = await MembershipProgram.create({
      name: 'Chương trình Khách hàng Thân thiết SipPoint 2026',
      description: 'Chương trình tích điểm và thăng hạng thành viên chính thức năm 2026',
      status: 'active',
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-12-31'),
      isApproved: true,
      approvedBy: adminEmployee._id,
      createdBy: adminEmployee._id
    });
    console.log('🎖 Đã tạo Chương trình Hội viên.');

    const membershipTiersData = [
      {
        programId: membershipProgram._id,
        name: 'ĐỒNG',
        minPoints: 0,
        discountPercentage: 0,
        description: 'Hạng mặc định khi tham gia tích điểm',
        status: 'active'
      },
      {
        programId: membershipProgram._id,
        name: 'BẠC',
        minPoints: 1000,
        discountPercentage: 5,
        description: 'Được giảm giá 5% cho mỗi hóa đơn',
        status: 'active'
      },
      {
        programId: membershipProgram._id,
        name: 'VÀNG',
        minPoints: 5000,
        discountPercentage: 10,
        description: 'Được giảm giá 10% cho mỗi hóa đơn',
        status: 'active'
      },
      {
        programId: membershipProgram._id,
        name: 'KIM CƯƠNG',
        minPoints: 15000,
        discountPercentage: 15,
        description: 'Được giảm giá 15% cho mỗi hóa đơn và ưu tiên phục vụ',
        status: 'active'
      }
    ];
    const insertedTiers = await MembershipTier.insertMany(membershipTiersData);
    console.log('🏅 Đã tạo dữ liệu Hạng Hội viên.');

    const dongTier = insertedTiers.find(t => t.name === 'ĐỒNG')._id;
    const bacTier = insertedTiers.find(t => t.name === 'BẠC')._id;
    const vangTier = insertedTiers.find(t => t.name === 'VÀNG')._id;
    const kimCuongTier = insertedTiers.find(t => t.name === 'KIM CƯƠNG')._id;

    // 5. Tạo dữ liệu Khách hàng
    const defaultPassword = await bcrypt.hash('password123', 10);
    const customers = [
      {
        customerId: '18239012',
        fullName: 'Nguyễn Thu Hà',
        email: 'ha.nguyen@email.com',
        phone: '0982123456',
        avatar: 'https://i.pravatar.cc/150?img=1',
        tierId: kimCuongTier,
        currentPoints: 12450,
        totalSpent: 65000000,
        dateOfBirth: new Date('1995-08-15'),
        password: defaultPassword,
        isActive: true,
        isVerified: true,
      },
      {
        customerId: '81726354',
        fullName: 'Trần Minh Quân',
        email: 'quan.tm@email.com',
        phone: '0912888999',
        avatar: 'https://i.pravatar.cc/150?img=11',
        tierId: vangTier,
        currentPoints: 4200,
        totalSpent: 25000000,
        dateOfBirth: new Date('1993-04-20'),
        password: defaultPassword,
        isActive: true,
        isVerified: true,
      },
      {
        customerId: '39485761',
        fullName: 'Lê Hồng Phong',
        email: 'phong.lh@email.com',
        phone: '0903456789',
        avatar: 'https://i.pravatar.cc/150?img=12',
        tierId: bacTier,
        currentPoints: 800,
        totalSpent: 7500000,
        dateOfBirth: new Date('1988-12-05'),
        password: defaultPassword,
        isActive: true,
        isVerified: true,
      },
      {
        customerId: '52839401',
        fullName: 'Phạm Mỹ Linh',
        email: 'linh.pm@email.com',
        phone: '0356777888',
        avatar: 'https://i.pravatar.cc/150?img=5',
        tierId: dongTier,
        currentPoints: 120,
        totalSpent: 1500000,
        dateOfBirth: new Date('1997-02-28'),
        password: defaultPassword,
        isActive: true,
        isVerified: true,
      }
    ];

    const insertedCustomers = await Customer.insertMany(customers);
    console.log('👥 Đã tạo dữ liệu Khách hàng.');

    // 6. Tạo dữ liệu Lịch sử điểm cho khách hàng đầu tiên
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
      }
    ]);
    console.log('📜 Đã tạo dữ liệu Lịch sử tích điểm.');

    // 7. Tạo dữ liệu Category
    const categoriesData = [
      { name: 'Cà phê', description: 'Cà phê truyền thống và cà phê pha máy Ý' },
      { name: 'Trà trái cây', description: 'Trà thanh mát kết hợp trái cây tươi' },
      { name: 'Đá xay', description: 'Ice blended ngọt ngào mát lạnh' },
    ];
    const insertedCategories = await Category.insertMany(categoriesData);
    console.log('📂 Đã tạo dữ liệu Categories.');

    // 8. Tạo dữ liệu Products
    const productsData = [
      {
        name: 'Cà phê sữa đá',
        description: 'Cà phê robusta đậm đà hòa quyện cùng sữa đặc béo ngậy',
        price: 29000,
        image: 'seed_cafe_sua_da',
        category: insertedCategories[0]._id,
        stock: 99,
        isActive: 'active',
      },
      {
        name: 'Trà đào cam sả',
        description: 'Vị thanh ngọt của đào hòa quyện cùng vị chua của cam và hương thơm dịu nhẹ từ sả',
        price: 45000,
        image: 'seed_tra_dao_cam_sa',
        category: insertedCategories[1]._id,
        stock: 50,
        isActive: 'active',
      }
    ];
    const insertedProducts = await Product.insertMany(productsData);
    console.log('☕️ Đã tạo dữ liệu Products.');

    // 9. Tạo dữ liệu Product Variants (Size và Topping)
    const variantsData = [];
    insertedProducts.forEach((product) => {
      // 1. Biến thể SIZE
      variantsData.push(
        {
          product: product._id,
          variantType: 'size',
          name: 'Size M',
          priceAdjustment: 0,
          isActive: 'active'
        },
        {
          product: product._id,
          variantType: 'size',
          name: 'Size L',
          priceAdjustment: 6000,
          isActive: 'active'
        }
      );

      // 2. Biến thể TOPPING
      if (product.category.toString() === insertedCategories[0]._id.toString()) {
        variantsData.push(
          {
            product: product._id,
            variantType: 'topping',
            name: 'Kem phô mai (Cheese foam)',
            priceAdjustment: 10000,
            isActive: 'active'
          },
          {
            product: product._id,
            variantType: 'topping',
            name: 'Thạch cà phê',
            priceAdjustment: 5000,
            isActive: 'active'
          }
        );
      } else {
        variantsData.push(
          {
            product: product._id,
            variantType: 'topping',
            name: 'Thạch đào miếng',
            priceAdjustment: 8000,
            isActive: 'active'
          },
          {
            product: product._id,
            variantType: 'topping',
            name: 'Trân châu trắng',
            priceAdjustment: 7000,
            isActive: 'active'
          }
        );
      }
    });

    await ProductVariant.insertMany(variantsData);
    console.log('🍭 Đã tạo dữ liệu Product Variants.');

    // 10. Tạo dữ liệu Vouchers
    const insertedVouchers = await Voucher.insertMany([
      {
        code: 'SIPPOINT20',
        title: 'Giảm 20% cho đơn hàng',
        description: 'Giảm tối đa 50K cho đơn hàng từ 100K',
        discountType: 'PERCENT',
        discountValue: 20,
        minOrderValue: 100000,
        maxDiscountLimit: 50000,
        endDate: new Date(new Date().getTime() + 30 * 24 * 60 * 60 * 1000), // Hạn 30 ngày
        usageLimit: 100,
        isActive: 'active',
      },
      {
        code: 'WELCOME50',
        title: 'Giảm ngay 50K',
        description: 'Giảm thẳng 50K cho đơn hàng từ 200K',
        discountType: 'FIXED',
        discountValue: 50000,
        minOrderValue: 200000,
        endDate: new Date(new Date().getTime() + 15 * 24 * 60 * 60 * 1000), // Hạn 15 ngày
        usageLimit: 50,
        isActive: 'active',
      }
    ]);
    console.log('🎫 Đã tạo dữ liệu Vouchers gốc.');

    // 11. Tạo CustomerVouchers mẫu cho khách hàng đầu tiên
    await CustomerVoucher.insertMany([
      {
        customerId: insertedCustomers[0]._id,
        voucherId: insertedVouchers[0]._id,
        title: 'Giảm 20% tổng hóa đơn',
        expiryDate: new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000),
        isUsed: false
      }
    ]);
    console.log('🎟 Đã tạo dữ liệu Voucher của khách.');

    // 12. Tạo dữ liệu Cửa hàng
    const storesData = [
      {
        name: 'SipPoint Quận 1',
        address: '123 Nguyễn Huệ, Quận 1, TP. HCM',
        phone: '02838222333',
        email: 'quan1@sippoint.com',
        description: 'Chi nhánh trung tâm Quận 1',
        isActive: 'active'
      }
    ];
    await Store.insertMany(storesData);
    console.log('🏪 Đã tạo dữ liệu Cửa hàng.');



    // 14. Tạo dữ liệu Product Prices
    const productPricesData = [];
    insertedProducts.forEach((prod) => {
      productPricesData.push({
        productId: prod._id,
        price: prod.price,
        sizePriceMap: {
          'Size M': prod.price,
          'Size L': prod.price + 6000
        },
        notes: `Bảng giá tiêu chuẩn cho ${prod.name}`
      });
    });
    await ProductPrice.insertMany(productPricesData);
    console.log('💰 Đã tạo dữ liệu Bảng giá Sản phẩm.');

    // 15. Tạo dữ liệu Promotion Program
    const promotionProgramsData = [
      {
        name: 'Chào hè rực rỡ 2026',
        description: 'Khuyến mãi giảm giá 10% cho toàn bộ hóa đơn từ 120.000đ',
        discountType: 'PERCENT',
        discountValue: 10,
        minOrderValue: 120000,
        maxDiscountAmount: 30000,
        startDate: new Date('2026-06-01'),
        endDate: new Date('2026-08-31'),
        isActive: 'active',
        isApproved: true,
        approvedBy: adminEmployee._id,
        createdBy: adminEmployee._id
      }
    ];
    await PromotionProgram.insertMany(promotionProgramsData);
    console.log('📣 Đã tạo dữ liệu Chương trình Khuyến mãi.');

    // 16. Tạo dữ liệu Feedback
    const feedbacksData = [
      {
        customerId: insertedCustomers[0]._id,
        rating: 5,
        comment: 'Nước uống rất ngon. Nhân viên siêu dễ thương!',
        reply: 'Cảm ơn bạn đã dành lời khen cho SipPoint!',
        replyBy: adminEmployee._id,
        status: 'approved'
      }
    ];
    await Feedback.insertMany(feedbacksData);
    console.log('💬 Đã tạo dữ liệu Đánh giá & Phản hồi.');

    // 17. Tạo dữ liệu Activity Log
    const activityLogsData = [
      {
        employeeId: adminEmployee._id,
        action: 'LOGIN',
        target: 'System',
        details: 'Quản trị viên đăng nhập vào hệ thống',
        ipAddress: '192.168.1.100'
      }
    ];
    await ActivityLog.insertMany(activityLogsData);
    console.log('📝 Đã tạo dữ liệu Nhật ký Hoạt động.');

    // 18. Tạo dữ liệu Notification
    const notificationsData = [
      {
        title: 'Bảo trì hệ thống Portal',
        content: 'Hệ thống quản lý sẽ bảo trì định kỳ từ 1h - 3h sáng.',
        recipientType: 'staff',
        type: 'system',
        status: 'active'
      }
    ];
    await Notification.insertMany(notificationsData);
    console.log('🔔 Đã tạo dữ liệu Thông báo.');

    console.log('🎉 Seeding hoàn tất thành công!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Lỗi khi seed data:', error);
    process.exit(1);
  }
};

seedData();
