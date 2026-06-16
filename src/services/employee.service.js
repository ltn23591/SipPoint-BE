const Employee = require('../models/employee.model');
const bcrypt = require('bcrypt');
const { ROLE } = require('../enums');
const validator = require('validator');

class EmployeeService {
  static async getAllEmployees() {
    const employees = await Employee.find({ isDeleted: false }).select('-password');
    return {
      status: 200,
      success: true,
      count: employees.length,
      message: 'Lấy danh sách nhân viên thành công',
      data: employees,
    };
  }

  static async getEmployeeById(id) {
    const employee = await Employee.findOne({ _id: id, isDeleted: false }).select('-password');
    if (!employee) {
      return { status: 404, success: false, message: `Không tìm thấy nhân viên với ID: ${id}` };
    }
    return {
      status: 200,
      success: true,
      data: employee,
      message: 'Lấy thông tin nhân viên thành công',
    };
  }

  static async getEmployeeByEmail(email) {
    return await Employee.findOne({ email, isDeleted: false }).select('+password');
  }

  static async createEmployee(employeeData) {
    let { name, email, password, role } = employeeData;

    if (!name || !name.toString().trim()) {
      return { status: 400, success: false, message: 'Tên là bắt buộc' };
    }

    if (!email || !validator.isEmail(email)) {
      return { status: 400, success: false, message: 'Email không hợp lệ' };
    }

    if (!password || password.length < 6) {
      return { status: 400, success: false, message: 'Mật khẩu phải từ 6 ký tự trở lên' };
    }

    if (role !== undefined && role !== null) {
      if (!Object.values(ROLE).includes(role)) {
        return { status: 400, success: false, message: 'Role không hợp lệ' };
      }
    } else {
      return { status: 400, success: false, message: 'Vui lòng phân quyền cho nhân viên' };
    }

    const employeeExists = await this.getEmployeeByEmail(email);
    if (employeeExists) {
      return { status: 400, success: false, message: 'Email đã được sử dụng' };
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const employee = await Employee.create({ name, email, password: hashedPassword, role });

    return {
      status: 201,
      success: true,
      message: 'Tạo tài khoản nhân viên thành công',
      data: {
        _id: employee._id,
        name: employee.name,
        email: employee.email,
        role: employee.role,
      },
    };
  }

  static async updateEmployee(id, updateData) {
    if (updateData.email) {
      const existEmail = await this.getEmployeeByEmail(updateData.email);
      if (existEmail && existEmail._id.toString() !== id) {
        return { status: 400, success: false, message: 'Email đã được sử dụng' };
      }
    }

    if (updateData.role !== undefined && updateData.role !== null) {
      if (!Object.values(ROLE).includes(updateData.role)) {
        return { status: 400, success: false, message: 'Role không hợp lệ' };
      }
    }

    if (updateData.password) {
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(updateData.password, salt);

      const employee = await Employee.findOne({ _id: id, isDeleted: false });
      if (employee) {
        employee.password = updateData.password;
        if (updateData.name) employee.name = updateData.name;
        if (updateData.role !== undefined) employee.role = updateData.role;
        if (updateData.status !== undefined) employee.status = updateData.status;
        await employee.save();
        return {
          status: 200,
          success: true,
          data: employee,
          message: 'Cập nhật thông tin nhân viên thành công',
        };
      }
      return { status: 404, success: false, message: `Không tìm thấy nhân viên với ID: ${id}` };
    }

    const employee = await Employee.findOneAndUpdate({ _id: id, isDeleted: false }, updateData, {
      new: true,
      runValidators: true,
    }).select('-password');

    if (!employee) {
      return { status: 404, success: false, message: `Không tìm thấy nhân viên với ID: ${id}` };
    }

    return {
      status: 200,
      success: true,
      data: employee,
      message: 'Cập nhật thông tin nhân viên thành công',
    };
  }

  static async deleteEmployee(id) {
    const employee = await Employee.findOneAndUpdate(
      { _id: id, isDeleted: false },
      { isDeleted: true },
      { new: true },
    );
    if (!employee) {
      return { status: 404, success: false, message: `Không tìm thấy nhân viên với ID: ${id}` };
    }

    return { status: 200, success: true, data: {}, message: 'Đã xóa nhân viên thành công' };
  }
}

module.exports = EmployeeService;
