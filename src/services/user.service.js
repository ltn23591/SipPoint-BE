const User = require('../models/user.model');
const bcrypt = require('bcrypt');
const { ROLE } = require('../enums');
const MESSAGES = require('../constants/messages');

class UserService {
  static async getAllUsers() {
    const users = await User.find({}).select('-password');
    return { status: 200, success: true, count: users.length, data: users };
  }

  static async getUserById(id) {
    const user = await User.findById(id).select('-password');
    if (!user) {
      return { status: 404, success: false, message: MESSAGES.USER.NOT_FOUND_WITH_ID(id) };
    }
    return { status: 200, success: true, data: user, message: MESSAGES.USER.GET_USER_SUCCESS };
  }

  static async getUserByEmail(email) {
    // Chỉ dùng trong nội bộ nên vẫn return document
    return await User.findOne({ email }).select('+password');
  }

  static async createUser(userData) {
    let { name, email, password, role } = userData;

    if (!name || !name.toString().trim()) {
      return { status: 400, success: false, message: MESSAGES.VALIDATION.NAME_REQUIRED };
    }

    const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
    if (!email || !emailRegex.test(email)) {
      return { status: 400, success: false, message: MESSAGES.VALIDATION.EMAIL_INVALID };
    }

    if (!password || password.length < 6) {
      return { status: 400, success: false, message: MESSAGES.VALIDATION.PASSWORD_MIN_LENGTH };
    }

    if (role !== undefined && role !== null) {
      if (!Object.values(ROLE).includes(Number(role))) {
        return { status: 400, success: false, message: MESSAGES.VALIDATION.ROLE_INVALID };
      }
      role = Number(role);
    }

    const userExists = await this.getUserByEmail(email);
    if (userExists) {
      return { status: 400, success: false, message: MESSAGES.AUTH.EMAIL_EXISTS };
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({ name, email, password: hashedPassword, role });

    return {
      status: 201,
      success: true,
      user,
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
        return { status: 400, success: false, message: MESSAGES.AUTH.EMAIL_EXISTS };
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
        return { status: 200, success: true, data: user, message: MESSAGES.USER.UPDATE_SUCCESS };
      }
      return { status: 404, success: false, message: MESSAGES.USER.NOT_FOUND_WITH_ID(id) };
    }

    const user = await User.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    }).select('-password');

    if (!user) {
      return { status: 404, success: false, message: MESSAGES.USER.NOT_FOUND_WITH_ID(id) };
    }

    return { status: 200, success: true, data: user, message: MESSAGES.USER.UPDATE_SUCCESS };
  }

  static async deleteUser(id) {
    const user = await User.findByIdAndDelete(id);
    if (!user) {
      return { status: 404, success: false, message: MESSAGES.USER.NOT_FOUND_WITH_ID(id) };
    }

    return { status: 200, success: true, data: {}, message: MESSAGES.USER.DELETE_SUCCESS };
  }
}

module.exports = UserService;
