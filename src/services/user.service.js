const User = require('../models/user.model');
const bcrypt = require('bcrypt');

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
    if (userData.password) {
      const salt = await bcrypt.genSalt(10);
      userData.password = await bcrypt.hash(userData.password, salt);
    }
    return await User.create(userData);
  }

  static async updateUser(id, updateData) {
    // Hash password if updating password
    if (updateData.password) {
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(updateData.password, salt);
      
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
