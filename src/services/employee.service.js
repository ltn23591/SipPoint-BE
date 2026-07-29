const Employee = require('../models/employee.model');
const StaffRole = require('../models/staffRole.model');
const bcrypt = require('bcrypt');
const validator = require('validator');
const AppError = require('../utils/AppError');

class EmployeeService {
  static async getAllEmployees() {
    const employees = await Employee.find({ isDeleted: false }).select('-password').populate('roleId');
    return employees;
  }

  static async getEmployeeById(id) {
    const employee = await Employee.findOne({ _id: id, isDeleted: false }).select('-password').populate('roleId');
    if (!employee) {
      throw new AppError(`Không tìm thấy nhân viên với ID: ${id}`, 404);
    }
    return employee;
  }

  static async getEmployeeByEmail(email) {
    return await Employee.findOne({ email, isDeleted: false }).select('+password');
  }

  static async createEmployee(employeeData) {
    let { name, email, password, roleId } = employeeData;

    if (!name || !name.toString().trim()) {
      throw new AppError('Tên là bắt buộc', 400);
    }

    if (!email || !validator.isEmail(email)) {
      throw new AppError('Email không hợp lệ', 400);
    }

    if (!password || password.length < 6) {
      throw new AppError('Mật khẩu phải từ 6 ký tự trở lên', 400);
    }

    if (!roleId) {
      throw new AppError('Vui lòng phân quyền cho nhân viên (roleId)', 400);
    }

    const staffRole = await StaffRole.findById(roleId);
    if (!staffRole) {
      throw new AppError('Role không hợp lệ', 400);
    }

    const employeeExists = await this.getEmployeeByEmail(email);
    if (employeeExists) {
      throw new AppError('Email đã được sử dụng', 400);
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const employee = await Employee.create({ name, email, password: hashedPassword, roleId });
    const populated = await Employee.findById(employee._id).select('-password').populate('roleId');

    return populated;
  }

  static async updateEmployee(id, updateData) {
    if (updateData.email) {
      const existEmail = await this.getEmployeeByEmail(updateData.email);
      if (existEmail && existEmail._id.toString() !== id) {
        throw new AppError('Email đã được sử dụng', 400);
      }
    }

    if (updateData.roleId) {
      const staffRole = await StaffRole.findById(updateData.roleId);
      if (!staffRole) {
        throw new AppError('Role không hợp lệ', 400);
      }
    }

    if (updateData.password) {
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(updateData.password, salt);

      const employee = await Employee.findOne({ _id: id, isDeleted: false });
      if (employee) {
        employee.password = updateData.password;
        if (updateData.name) employee.name = updateData.name;
        if (updateData.roleId) employee.roleId = updateData.roleId;
        if (updateData.status !== undefined) employee.status = updateData.status;
        await employee.save();
        const populated = await Employee.findById(employee._id).select('-password').populate('roleId');
        return populated;
      }
      throw new AppError(`Không tìm thấy nhân viên với ID: ${id}`, 404);
    }

    const employee = await Employee.findOneAndUpdate({ _id: id, isDeleted: false }, updateData, {
      new: true,
      runValidators: true,
    }).select('-password').populate('roleId');

    if (!employee) {
      throw new AppError(`Không tìm thấy nhân viên với ID: ${id}`, 404);
    }

    return employee;
  }

  static async deleteEmployee(id) {
    const employee = await Employee.findOneAndUpdate(
      { _id: id, isDeleted: false },
      { isDeleted: true },
      { new: true },
    );
    if (!employee) {
      throw new AppError(`Không tìm thấy nhân viên với ID: ${id}`, 404);
    }

    return {};
  }
}

module.exports = EmployeeService;
