require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const CustomerRank = require('../src/models/customerRank.model');
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

const seedData = async () => {
  try {
    // 1. Kết nối MongoDB
    if (!process.env.MONGO_URI) {
      throw new Error('Vui lòng cung cấp MONGO_URI trong file .env');
    }
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Đã kết nối MongoDB thành công.');

    // 2. Xóa dữ liệu cũ
    await CustomerRank.deleteMany({});
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
    console.log('🗑 Đã xóa toàn bộ dữ liệu cũ.');

    // 3. Tạo dữ liệu Mức hạng (Ranks)
    await CustomerRank.insertMany([
      { name: 'ĐỒNG', minSpent: 0, description: 'Hạng mặc định khi đăng ký' },
      { name: 'BẠC', minSpent: 5000000, description: 'Chi tiêu từ 5 triệu' },
      { name: 'VÀNG', minSpent: 20000000, description: 'Chi tiêu từ 20 triệu' },
      { name: 'KIM CƯƠNG', minSpent: 50000000, description: 'Chi tiêu từ 50 triệu' },
    ]);
    console.log('✨ Đã tạo dữ liệu Customer Ranks.');

    // 4. Tạo dữ liệu Khách hàng giống Mockup UI với mã số 8 chữ số
    const defaultPassword = await bcrypt.hash('password123', 10);
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
        tier: 'VÀNG',
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
        tier: 'BẠC',
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
        tier: 'ĐỒNG',
        currentPoints: 120,
        totalSpent: 1500000,
        dateOfBirth: new Date('1997-02-28'),
        password: defaultPassword,
        isActive: true,
        isVerified: true,
      },
      {
        customerId: '99283711',
        fullName: 'Vũ Hoàng Long',
        email: 'long.vh@email.com',
        phone: '0976111222',
        avatar: 'https://i.pravatar.cc/150?img=3',
        tier: 'KIM CƯƠNG',
        currentPoints: 15000,
        totalSpent: 72000000,
        dateOfBirth: new Date('1990-10-10'),
        password: defaultPassword,
        isActive: true,
        isVerified: true,
      },
      {
        customerId: '77283641',
        fullName: 'Hoàng Khánh Vy',
        email: 'vy.hk@email.com',
        phone: '0965333444',
        avatar: 'https://i.pravatar.cc/150?img=9',
        tier: 'VÀNG',
        currentPoints: 3500,
        totalSpent: 18500000,
        dateOfBirth: new Date('1998-05-14'),
        password: defaultPassword,
        isActive: true,
        isVerified: true,
      },
      {
        customerId: '66283742',
        fullName: 'Phan Văn Hải',
        email: 'hai.pv@email.com',
        phone: '0944555666',
        avatar: 'https://i.pravatar.cc/150?img=8',
        tier: 'BẠC',
        currentPoints: 1200,
        totalSpent: 9200000,
        dateOfBirth: new Date('1992-07-22'),
        password: defaultPassword,
        isActive: true,
        isVerified: true,
      },
      {
        customerId: '55283749',
        fullName: 'Đỗ Thùy Trang',
        email: 'trang.dt@email.com',
        phone: '0933777888',
        avatar: 'https://i.pravatar.cc/150?img=16',
        tier: 'ĐỒNG',
        currentPoints: 450,
        totalSpent: 3200000,
        dateOfBirth: new Date('1996-03-09'),
        password: defaultPassword,
        isActive: true,
        isVerified: true,
      },
      {
        customerId: '44283758',
        fullName: 'Bùi Anh Tuấn',
        email: 'tuan.ba@email.com',
        phone: '0922888111',
        avatar: 'https://i.pravatar.cc/150?img=4',
        tier: 'ĐỒNG',
        currentPoints: 0,
        totalSpent: 0,
        dateOfBirth: new Date('2000-01-01'),
        password: defaultPassword,
        isActive: true,
        isVerified: true,
      },
      {
        customerId: '33283767',
        fullName: 'Ngô Gia Bảo',
        email: 'bao.ng@email.com',
        phone: '0911999222',
        avatar: 'https://i.pravatar.cc/150?img=15',
        tier: 'VÀNG',
        currentPoints: 5100,
        totalSpent: 22000000,
        dateOfBirth: new Date('1994-09-17'),
        password: defaultPassword,
        isActive: true,
        isVerified: true,
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
        name: 'Bạc sỉu',
        description: 'Cà phê sữa đá nhiều sữa thích hợp cho những ai thích vị ngọt ngào',
        price: 32000,
        image: 'seed_bac_siu',
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
      },
      {
        name: 'Trà vải lài',
        description: 'Trà nhài thơm nhẹ kết hợp cùng quả vải ngọt lịm',
        price: 42000,
        image: 'seed_tra_vai_lai',
        category: insertedCategories[1]._id,
        stock: 50,
        isActive: 'active',
      },
      {
        name: 'Matcha đá xay',
        description: 'Trà xanh Nhật Bản đá xay kem tươi mịn màng',
        price: 49000,
        image: 'seed_matcha_da_xay',
        category: insertedCategories[2]._id,
        stock: 30,
        isActive: 'active',
      }
    ];
    const insertedProducts = await Product.insertMany(productsData);
    console.log('☕️ Đã tạo dữ liệu Products.');

    // 9. Tạo dữ liệu Product Variants (Size và Topping) cho từng Product
    const variantsData = [];
    const { VARIANT_TYPE } = require('../src/enums');
    
    // Thêm các biến thể cho từng sản phẩm
    insertedProducts.forEach((product) => {
      // 1. Biến thể SIZE
      variantsData.push(
        {
          product: product._id,
          variantType: VARIANT_TYPE.SIZE, // 0
          name: 'Size M',
          priceAdjustment: 0, // Mặc định không tăng giá
          isActive: 'active'
        },
        {
          product: product._id,
          variantType: VARIANT_TYPE.SIZE, // 0
          name: 'Size L',
          priceAdjustment: 6000, // Tăng thêm 6,000đ khi nâng size L
          isActive: 'active'
        }
      );

      // 2. Biến thể TOPPING tùy theo danh mục
      // Nếu là danh mục Cà phê (index 0) hoặc Đá xay (index 2) -> Thêm thạch cafe/kem phô mai
      if (
        product.category.toString() === insertedCategories[0]._id.toString() ||
        product.category.toString() === insertedCategories[2]._id.toString()
      ) {
        variantsData.push(
          {
            product: product._id,
            variantType: VARIANT_TYPE.TOPPING, // 1
            name: 'Kem phô mai (Cheese foam)',
            priceAdjustment: 10000,
            isActive: 'active'
          },
          {
            product: product._id,
            variantType: VARIANT_TYPE.TOPPING, // 1
            name: 'Thạch cà phê',
            priceAdjustment: 5000,
            isActive: 'active'
          }
        );
      }

      // Nếu là danh mục Trà trái cây (index 1) -> Thêm thạch đào/trân châu trắng
      if (product.category.toString() === insertedCategories[1]._id.toString()) {
        variantsData.push(
          {
            product: product._id,
            variantType: VARIANT_TYPE.TOPPING, // 1
            name: 'Thạch đào miếng',
            priceAdjustment: 8000,
            isActive: 'active'
          },
          {
            product: product._id,
            variantType: VARIANT_TYPE.TOPPING, // 1
            name: 'Trân châu trắng',
            priceAdjustment: 7000,
            isActive: 'active'
          }
        );
      }
    });

    await ProductVariant.insertMany(variantsData);
    console.log('🍭 Đã tạo dữ liệu Product Variants.');

    // 10. Tạo dữ liệu Vouchers gốc mẫu
    const Voucher = require('../src/models/voucher.model');
    const { DISCOUNT_TYPE } = require('../src/enums');
    await Voucher.deleteMany({}); // Đảm bảo dọn sạch bảng vouchers
    await Voucher.insertMany([
      {
        code: 'SIPPOINT20',
        title: 'Giảm 20% cho đơn hàng',
        description: 'Giảm tối đa 50K cho đơn hàng từ 100K',
        discountType: DISCOUNT_TYPE.PERCENTAGE, // 0
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
        discountType: DISCOUNT_TYPE.FIXED, // 1
        discountValue: 50000,
        minOrderValue: 200000,
        endDate: new Date(new Date().getTime() + 15 * 24 * 60 * 60 * 1000), // Hạn 15 ngày
        usageLimit: 50,
        isActive: 'active',
      }
    ]);
    console.log('🎫 Đã tạo dữ liệu Vouchers gốc.');

    // 10.5 Tạo nhân viên Admin mặc định để làm reference
    const adminPassword = await bcrypt.hash('password123', 10);
    const adminEmployee = await Employee.create({
      name: 'Admin Manager',
      email: 'admin@sippoint.com',
      password: adminPassword,
      role: 'admin',
      status: 'active'
    });
    console.log('👤 Đã tạo nhân viên Admin mặc định.');

    // 11. Tạo dữ liệu Cửa hàng
    const storesData = [
      {
        name: 'SipPoint Quận 1',
        address: '123 Nguyễn Huệ, Quận 1, TP. HCM',
        phone: '02838222333',
        email: 'quan1@sippoint.com',
        description: 'Chi nhánh trung tâm Quận 1',
        isActive: 'active'
      },
      {
        name: 'SipPoint Bình Thạnh',
        address: '456 Điện Biên Phủ, Bình Thạnh, TP. HCM',
        phone: '02835123456',
        email: 'binhthanh@sippoint.com',
        description: 'Chi nhánh gần bờ sông',
        isActive: 'active'
      },
      {
        name: 'SipPoint Cầu Giấy',
        address: '789 Xuân Thủy, Cầu Giấy, Hà Nội',
        phone: '02437999888',
        email: 'caugiay@sippoint.com',
        description: 'Chi nhánh đầu tiên tại Hà Nội',
        isActive: 'inactive'
      }
    ];
    await Store.insertMany(storesData);
    console.log('🏪 Đã tạo dữ liệu Cửa hàng.');

    // 12. Tạo dữ liệu Staff Roles
    const staffRolesData = [
      {
        name: 'Quản trị viên',
        code: 'admin',
        permissions: ['manage_store', 'manage_staff', 'view_reports', 'manage_products'],
        description: 'Toàn quyền quản trị hệ thống POS và Portal'
      },
      {
        name: 'Thu ngân',
        code: 'cashier',
        permissions: ['create_order', 'payment', 'view_order'],
        description: 'Nhân viên thực hiện order và thanh toán tại quầy'
      },
      {
        name: 'Pha chế',
        code: 'barista',
        permissions: ['view_order', 'complete_drink'],
        description: 'Nhân viên pha chế nhận thông tin order nước uống'
      }
    ];
    await StaffRole.insertMany(staffRolesData);
    console.log('⚙️ Đã tạo dữ liệu Vai trò Nhân viên.');

    // 13. Tạo dữ liệu Product Prices
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

    // 14. Tạo dữ liệu Membership Program & Tiers
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
    await MembershipTier.insertMany(membershipTiersData);
    console.log('🏅 Đã tạo dữ liệu Hạng Hội viên.');

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
      },
      {
        name: 'Giờ vàng Deal đỉnh',
        description: 'Giảm ngay 20k cho hóa đơn từ 80.000đ từ 14h - 17h hàng ngày',
        discountType: 'FIXED',
        discountValue: 20000,
        minOrderValue: 80000,
        startDate: new Date('2026-06-15'),
        endDate: new Date('2026-07-15'),
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
        comment: 'Nước uống rất ngon, đặc biệt là Trà đào cam sả. Nhân viên siêu dễ thương!',
        reply: 'Cảm ơn Hà đã dành lời khen cho SipPoint! Mong được phục vụ bạn lần sau!',
        replyBy: adminEmployee._id,
        status: 'approved'
      },
      {
        customerId: insertedCustomers[1]._id,
        rating: 4,
        comment: 'Cà phê robusta đậm vị đúng điệu, tuy nhiên quán hơi đông vào giờ trưa nên đợi hơi lâu.',
        reply: 'SipPoint xin lỗi vì sự bất tiện này ạ, quán sẽ tối ưu thời gian ra nước nhanh hơn.',
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
      },
      {
        employeeId: adminEmployee._id,
        action: 'CREATE',
        target: 'MembershipProgram',
        details: 'Khởi tạo chương trình khách hàng thân thiết năm 2026',
        ipAddress: '192.168.1.100'
      },
      {
        employeeId: adminEmployee._id,
        action: 'UPDATE',
        target: 'Store',
        details: 'Cập nhật số điện thoại liên hệ chi nhánh Quận 1',
        ipAddress: '192.168.1.100'
      }
    ];
    await ActivityLog.insertMany(activityLogsData);
    console.log('📝 Đã tạo dữ liệu Nhật ký Hoạt động.');

    // 18. Tạo dữ liệu Notification
    const notificationsData = [
      {
        title: 'Bảo trì hệ thống Portal',
        content: 'Hệ thống quản lý sẽ bảo trì định kỳ từ 1h - 3h sáng ngày 25/06/2026.',
        recipientType: 'staff',
        type: 'system',
        status: 'active'
      },
      {
        title: 'Quà tặng mùa hè từ SipPoint!',
        content: 'Ưu đãi Giảm giá 10% đã sẵn sàng trong ví voucher của bạn. Kiểm tra ngay!',
        recipientType: 'customer',
        type: 'promotion',
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
