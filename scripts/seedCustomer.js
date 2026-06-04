require('dotenv').config();
const mongoose = require('mongoose');
const CustomerRank = require('../src/models/customerRank.model');
const Customer = require('../src/models/customer.model');
const PointHistory = require('../src/models/pointHistory.model');
const CustomerVoucher = require('../src/models/customerVoucher.model');
const Category = require('../src/models/category.model');
const Product = require('../src/models/product.model');
const ProductVariant = require('../src/models/productVariant.model');

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
        avatar: '', 
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
        isActive: 1,
      },
      {
        name: 'Bạc sỉu',
        description: 'Cà phê sữa đá nhiều sữa thích hợp cho những ai thích vị ngọt ngào',
        price: 32000,
        image: 'seed_bac_siu',
        category: insertedCategories[0]._id,
        stock: 99,
        isActive: 1,
      },
      {
        name: 'Trà đào cam sả',
        description: 'Vị thanh ngọt của đào hòa quyện cùng vị chua của cam và hương thơm dịu nhẹ từ sả',
        price: 45000,
        image: 'seed_tra_dao_cam_sa',
        category: insertedCategories[1]._id,
        stock: 50,
        isActive: 1,
      },
      {
        name: 'Trà vải lài',
        description: 'Trà nhài thơm nhẹ kết hợp cùng quả vải ngọt lịm',
        price: 42000,
        image: 'seed_tra_vai_lai',
        category: insertedCategories[1]._id,
        stock: 50,
        isActive: 1,
      },
      {
        name: 'Matcha đá xay',
        description: 'Trà xanh Nhật Bản đá xay kem tươi mịn màng',
        price: 49000,
        image: 'seed_matcha_da_xay',
        category: insertedCategories[2]._id,
        stock: 30,
        isActive: 1,
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
          isActive: 1
        },
        {
          product: product._id,
          variantType: VARIANT_TYPE.SIZE, // 0
          name: 'Size L',
          priceAdjustment: 6000, // Tăng thêm 6,000đ khi nâng size L
          isActive: 1
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
            isActive: 1
          },
          {
            product: product._id,
            variantType: VARIANT_TYPE.TOPPING, // 1
            name: 'Thạch cà phê',
            priceAdjustment: 5000,
            isActive: 1
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
            isActive: 1
          },
          {
            product: product._id,
            variantType: VARIANT_TYPE.TOPPING, // 1
            name: 'Trân châu trắng',
            priceAdjustment: 7000,
            isActive: 1
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
        isActive: 1,
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
        isActive: 1,
      }
    ]);
    console.log('🎫 Đã tạo dữ liệu Vouchers gốc.');

    console.log('🎉 Seeding hoàn tất thành công!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Lỗi khi seed data:', error);
    process.exit(1);
  }
};

seedData();
