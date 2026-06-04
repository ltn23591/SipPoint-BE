const Customer = require('../models/customer.model');
const PointHistory = require('../models/pointHistory.model');
const CustomerVoucher = require('../models/customerVoucher.model');
const CustomerRank = require('../models/customerRank.model');

class CustomerService {
  // Lấy danh sách khách hàng (có phân trang và lọc)
  static async getAllCustomers(query) {
    const { page = 1, limit = 10, tier, search } = query;
    const skip = (page - 1) * limit;

    const filter = {};
    if (tier) filter.tier = tier;
    if (search) {
      filter.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { customerId: { $regex: search, $options: 'i' } },
      ];
    }

    const customers = await Customer.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Customer.countDocuments(filter);

    return {
      status: 200,
      success: true,
      data: customers,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Lấy chi tiết khách hàng (kèm lịch sử điểm và voucher)
  static async getCustomerById(id) {
    const customer = await Customer.findById(id);
    if (!customer) {
      return { status: 404, success: false, message: 'Không tìm thấy khách hàng' };
    }

    const pointHistories = await PointHistory.find({ customerId: id })
      .sort({ createdAt: -1 })
      .limit(10);
    const vouchers = await CustomerVoucher.find({ customerId: id, isUsed: false });

    return {
      status: 200,
      success: true,
      data: {
        customer,
        pointHistories,
        vouchers,
      },
    };
  }

  // Thêm mới khách hàng
  static async createCustomer(data) {
    const existing = await Customer.findOne({ phone: data.phone });
    if (existing) {
      return { status: 400, success: false, message: 'Số điện thoại đã tồn tại' };
    }

    if (!data.customerId) {
      // Tạo mã gồm 8 chữ số ngẫu nhiên (từ 10000000 đến 99999999)
      data.customerId = Math.floor(10000000 + Math.random() * 90000000).toString();
    }

    const newCustomer = await Customer.create(data);
    return { status: 201, success: true, message: 'Thêm khách hàng thành công', data: newCustomer };
  }

  // Cập nhật thông tin khách hàng
  static async updateCustomer(id, data) {
    const updatedCustomer = await Customer.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    });

    if (!updatedCustomer) {
      return { status: 404, success: false, message: 'Không tìm thấy khách hàng' };
    }

    return { status: 200, success: true, message: 'Cập nhật thành công', data: updatedCustomer };
  }

  // Cộng / Trừ điểm khách hàng
  static async adjustPoints(id, pointsChange, title, description, transactionType) {
    const customer = await Customer.findById(id);
    if (!customer) {
      return { status: 404, success: false, message: 'Không tìm thấy khách hàng' };
    }

    customer.currentPoints += Number(pointsChange);
    // Nếu điểm tổng cập nhật dựa theo điểm tích lũy:
    if (pointsChange > 0) {
      customer.totalSpent += Number(pointsChange) * 1000; // Giả sử 1 điểm = 1000đ chi tiêu
    }

    // Tự động thăng hạng dựa trên tổng chi tiêu (query từ bảng CustomerRank)
    const ranks = await CustomerRank.find().sort({ minSpent: -1 });

    if (ranks.length > 0) {
      const matchedRank = ranks.find((r) => customer.totalSpent >= r.minSpent);
      if (matchedRank) {
        customer.tier = matchedRank.name;
      } else {
        // Nếu không đủ điểm cho bất kỳ hạng nào, lấy hạng thấp nhất
        customer.tier = ranks[ranks.length - 1].name;
      }
    }

    await customer.save();

    // Ghi lại lịch sử
    await PointHistory.create({
      customerId: id,
      title,
      description,
      pointsChange: Number(pointsChange),
      transactionType,
    });

    return { status: 200, success: true, message: 'Điều chỉnh điểm thành công', data: customer };
  }
}

module.exports = CustomerService;
