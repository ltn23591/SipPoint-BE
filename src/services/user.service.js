const User = require('../models/user.model');

class UserService {
  static async getAllUsers() {
    return await User.find({}).select('-password');
  }

  static async getUserById(id) {
    return await User.findById(id).select('-password');
  }

  static async getUserByEmail(email) {
    return await User.findOne({ email }).select('+password');
  }

  static async createUser(userData) {
    return await User.create(userData);
  }

  static async updateUser(id, updateData) {
    // Nếu có update password, cần đảm bảo pre-save hook chạy
    if (updateData.password) {
      const user = await User.findById(id);
      if (user) {
        user.password = updateData.password;
        if (updateData.name) user.name = updateData.name;
        if (updateData.role) user.role = updateData.role;
        await user.save();
        return user;
      }
      return null;
    }
    
    return await User.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    }).select('-password');
  }

  static async deleteUser(id) {
    return await User.findByIdAndDelete(id);
  }
}

module.exports = UserService;
