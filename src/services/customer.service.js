const Customer = require('../models/customer.model');
const PointHistory = require('../models/pointHistory.model');
const CustomerVoucher = require('../models/customerVoucher.model');
const MembershipTier = require('../models/membershipTier.model');

class CustomerService {
  // Lấy danh sách khách hàng (có phân trang và lọc)
  static async getAllCustomers(query) {
    const { page = 1, limit = 10, tierId, search } = query;
    const skip = (page - 1) * limit;

    const filter = {};
    if (tierId) filter.tierId = tierId;
    if (search) {
      filter.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { customerId: { $regex: search, $options: 'i' } },
      ];
    }

    const customers = await Customer.find(filter)
      .populate('tierId')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Customer.countDocuments(filter);

    return {
      status: 200,
      success: true,
      message: 'Lấy danh sách khách hàng thành công',
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
    const customer = await Customer.findById(id).populate('tierId');
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
      message: 'Lấy thông tin chi tiết khách hàng thành công',
      data: {
        customer,
        pointHistories,
        vouchers,
      },
    };
  }

  // Khách hàng tự lấy lịch sử điểm của mình
  static async getMyPointHistory(customerId) {
    const pointHistories = await PointHistory.find({ customerId })
      .sort({ createdAt: -1 })
      .limit(20);

    return {
      status: 200,
      success: true,
      message: 'Lấy lịch sử điểm thành công',
      data: pointHistories,
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

    // Tự động gán hạng thấp nhất của MembershipTier
    if (!data.tierId) {
      const lowestTier = await MembershipTier.findOne({ status: 'active' }).sort({ minPoints: 1 });
      if (lowestTier) {
        data.tierId = lowestTier._id;
      }
    }

    const newCustomer = await Customer.create(data);
    const populated = await Customer.findById(newCustomer._id).populate('tierId');
    return { status: 201, success: true, message: 'Thêm khách hàng thành công', data: populated };
  }

  // Cập nhật thông tin khách hàng
  static async updateCustomer(id, data) {
    const updatedCustomer = await Customer.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    }).populate('tierId');

    if (!updatedCustomer) {
      return { status: 404, success: false, message: 'Không tìm thấy khách hàng' };
    }

    return { status: 200, success: true, message: 'Cập nhật thành công', data: updatedCustomer };
  }

  // Khách hàng tự cập nhật thông tin cá nhân
  static async updateMyProfile(id, data) {
    const { fullName, phone, email, dateOfBirth, avatar } = data;
    const updateData = {};
    if (fullName !== undefined) updateData.fullName = fullName;
    if (phone !== undefined) updateData.phone = phone;
    if (email !== undefined) updateData.email = email;
    if (dateOfBirth !== undefined) updateData.dateOfBirth = dateOfBirth;
    if (avatar !== undefined) updateData.avatar = avatar;

    const updatedCustomer = await Customer.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select('-password').populate('tierId');

    if (!updatedCustomer) {
      return { status: 404, success: false, message: 'Không tìm thấy khách hàng' };
    }

    return { status: 200, success: true, message: 'Cập nhật thông tin thành công', data: updatedCustomer };
  }

  // Cộng / Trừ điểm khách hàng
  static async adjustPoints(id, pointsChange, title, description, transactionType) {
    const customer = await Customer.findById(id);
    if (!customer) {
      return { status: 404, success: false, message: 'Không tìm thấy khách hàng' };
    }

    const change = Number(pointsChange);
    if (isNaN(change)) {
      return { status: 400, success: false, message: 'Số điểm thay đổi không hợp lệ' };
    }

    if (change < 0 && customer.currentPoints + change < 0) {
      return {
        status: 400,
        success: false,
        message: 'Số điểm trừ vượt quá số điểm tích lũy hiện có của khách hàng',
      };
    }

    customer.currentPoints += change;
    if (change > 0) {
      customer.totalSpent += change * 1000; // Giả sử 1 điểm = 1000đ chi tiêu
    }

    // Tự động thăng hạng dựa trên điểm tích lũy (MembershipTier)
    const tiers = await MembershipTier.find({ status: 'active' }).sort({ minPoints: -1 });

    if (tiers.length > 0) {
      const matchedTier = tiers.find((t) => customer.currentPoints >= t.minPoints);
      if (matchedTier) {
        customer.tierId = matchedTier._id;
      } else {
        // Nếu không đủ điểm cho bất kỳ hạng nào, lấy hạng thấp nhất
        customer.tierId = tiers[tiers.length - 1]._id;
      }
    }

    await customer.save();

    // Ghi lại lịch sử
    await PointHistory.create({
      customerId: id,
      title,
      description,
      pointsChange: change,
      transactionType,
    });

    const updatedCustomer = await Customer.findById(customer._id).populate('tierId');

    return { status: 200, success: true, message: 'Điều chỉnh điểm thành công', data: updatedCustomer };
  }
}

module.exports = CustomerService;
