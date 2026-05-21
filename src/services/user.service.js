const User = require('../models/user.model');
const bcrypt = require('bcrypt');
const { ROLE } = require('../enums');

class UserService {
  static async getAllUsers() {
    const users = await User.find({}).select('-password');
    return { status: 200, success: true, count: users.length, data: users };
  }

  static async getUserById(id) {
    const user = await User.findById(id).select('-password');
    if (!user) {
      return { status: 404, success: false, message: `Không tìm thấy người dùng với ID: ${id}` };
    }
    return { status: 200, success: true, data: user, message: 'Lấy thông tin người dùng thành công' };
  }

  static async getUserByEmail(email) {
    // Chỉ dùng trong nội bộ nên vẫn return document
    return await User.findOne({ email }).select('+password');
  }

  static async createUser(userData) {
    let { name, email, password, role } = userData;

    if (!name || !name.toString().trim()) {
      return { status: 400, success: false, message: 'Tên là bắt buộc' };
    }

    const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
    if (!email || !emailRegex.test(email)) {
      return { status: 400, success: false, message: 'Email không hợp lệ' };
    }

    if (!password || password.length < 6) {
      return { status: 400, success: false, message: 'Mật khẩu phải từ 6 ký tự trở lên' };
    }

    if (role !== undefined && role !== null) {
      if (!Object.values(ROLE).includes(Number(role))) {
        return { status: 400, success: false, message: 'Role không hợp lệ' };
      }
      role = Number(role);
    }

    const userExists = await this.getUserByEmail(email);
    if (userExists) {
      return { status: 400, success: false, message: 'Email đã được sử dụng' };
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({ name, email, password: hashedPassword, role });

    return {
      status: 201,
      success: true,
      user, // Document for internal use if needed
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }

  static async updateUser(id, updateData) {
    if (updateData.email) {
      const existEmail = await this.getUserByEmail(updateData.email);
      if (existEmail && existEmail._id.toString() !== id) {
        return { status: 400, success: false, message: 'Email đã được sử dụng' };
      }
    }

    if (updateData.password) {
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(updateData.password, salt);

      const user = await User.findById(id);
      if (user) {
        user.password = updateData.password;
        if (updateData.name) user.name = updateData.name;
        if (updateData.role) user.role = updateData.role;
        await user.save();
        return { status: 200, success: true, data: user, message: 'Cập nhật thông tin người dùng thành công' };
      }
      return { status: 404, success: false, message: `Không tìm thấy người dùng với ID: ${id}` };
    }

    const user = await User.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    }).select('-password');

    if (!user) {
      return { status: 404, success: false, message: `Không tìm thấy người dùng với ID: ${id}` };
    }

    return { status: 200, success: true, data: user, message: 'Cập nhật thông tin người dùng thành công' };
  }

  static async deleteUser(id) {
    const user = await User.findByIdAndDelete(id);
    if (!user) {
      return { status: 404, success: false, message: `Không tìm thấy người dùng với ID: ${id}` };
    }

    return { status: 200, success: true, data: {}, message: 'Đã xóa người dùng thành công' };
  }
}

module.exports = UserService;
