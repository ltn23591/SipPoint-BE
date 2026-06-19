const validator = require('validator');
const sendEmail = require('../utils/email');
const logger = require('../config/logger');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const Employee = require('../models/employee.model');
const Customer = require('../models/customer.model');
const OTP = require('../models/otp.model');
const { OTP_TYPE, USER_STATUS } = require('../enums');

class AuthService {
  // Đăng ký cho Khách hàng (Customer) - Có xác thực OTP qua Email
  static async customerRegister(data) {
    const fullName = data.fullName || data.name;
    const { phone, email, password } = data;

    if (!fullName || !fullName.toString().trim()) {
      return { status: 400, success: false, message: 'Tên khách hàng là bắt buộc' };
    }

    if (!phone || !phone.toString().trim()) {
      return { status: 400, success: false, message: 'Số điện thoại là bắt buộc' };
    }

    if (!email || !validator.isEmail(email)) {
      return { status: 400, success: false, message: 'Email không hợp lệ' };
    }

    const customerExists = await Customer.findOne({ phone });
    if (customerExists) {
      return { status: 400, success: false, message: 'Số điện thoại đã được đăng ký' };
    }

    const emailExists = await Customer.findOne({ email });
    if (emailExists) {
      return { status: 400, success: false, message: 'Email đã được sử dụng' };
    }

    if (!password || password.length < 6) {
      return { status: 400, success: false, message: 'Mật khẩu phải từ 6 ký tự trở lên' };
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Tạo mã số khách hàng 8 chữ số ngẫu nhiên
    const customerId = Math.floor(10000000 + Math.random() * 90000000).toString();

    const customer = await Customer.create({
      customerId,
      fullName,
      phone,
      email,
      password: hashedPassword,
      isActive: true,
      isVerified: false, // Bắt buộc xác thực trước
    });

    // Tạo mã OTP xác thực email đăng ký
    const otp = crypto.randomInt(100000, 999999).toString();
    await OTP.create({
      userId: customer._id,
      code: otp,
      type: OTP_TYPE.REGISTER,
      userModel: 'Customer'
    });

    // Gửi email chứa OTP cho khách hàng
    sendEmail({
      email: customer.email,
      subject: 'Mã xác thực Email đăng ký tài khoản Khách hàng',
      template: 'otp',
      data: { name: customer.fullName, otp: otp }
    }).catch(err => logger.error('Gửi email xác thực khách hàng thất bại', err));

    return {
      status: 201,
      success: true,
      message: 'Đăng ký thành công. Vui lòng kiểm tra email để lấy mã xác thực kích hoạt tài khoản.',
      data: {
        _id: customer._id,
        customerId: customer.customerId,
        fullName: customer.fullName,
        phone: customer.phone,
        email: customer.email,
        tier: customer.tier,
      },
    };
  }

  // Xác thực Email qua OTP cho Khách hàng
  static async customerVerifyEmail(email, otp) {
    if (!email || !otp) {
      return { status: 400, success: false, message: 'Vui lòng cung cấp email và mã xác thực' };
    }

    const customer = await Customer.findOne({ email }).select('+password');
    if (!customer) {
      return { status: 404, success: false, message: 'Tài khoản khách hàng không tồn tại' };
    }

    if (customer.isVerified) {
      return { status: 400, success: false, message: 'Tài khoản này đã được xác thực trước đó' };
    }

    const otpRecord = await OTP.findOne({
      userId: customer._id,
      code: otp,
      type: OTP_TYPE.REGISTER,
      userModel: 'Customer'
    });

    if (!otpRecord) {
      return { status: 400, success: false, message: 'Mã xác thực không chính xác hoặc đã hết hạn' };
    }

    await otpRecord.deleteOne();

    // Xác thực thành công
    customer.isVerified = true;
    await customer.save();

    return { status: 200, success: true, message: 'Xác thực tài khoản thành công. Bạn đã được đăng nhập.', user: customer, userType: 'customer' };
  }

  // Gửi lại mã OTP xác thực cho Khách hàng
  static async customerResendVerifyEmail(email) {
    if (!email) {
      return { status: 400, success: false, message: 'Vui lòng cung cấp email' };
    }

    const customer = await Customer.findOne({ email });
    if (!customer) {
      return { status: 404, success: false, message: 'Tài khoản khách hàng không tồn tại' };
    }

    if (customer.isVerified) {
      return { status: 400, success: false, message: 'Tài khoản này đã được xác thực trước đó' };
    }

    const otp = crypto.randomInt(100000, 999999).toString();
    await OTP.deleteMany({ userId: customer._id, type: OTP_TYPE.REGISTER, userModel: 'Customer' });
    await OTP.create({
      userId: customer._id,
      code: otp,
      type: OTP_TYPE.REGISTER,
      userModel: 'Customer'
    });

    sendEmail({
      email: customer.email,
      subject: 'Mã xác thực Email của bạn (Gửi lại)',
      template: 'otp',
      data: { name: customer.fullName, otp: otp }
    }).catch(err => logger.error('Gửi email xác thực khách hàng thất bại (gửi lại)', err));

    return { status: 200, success: true, message: 'Mã xác thực mới đã được gửi vào email của bạn' };
  }

  // Đăng nhập cho Khách hàng (Customer)
  static async customerLogin(loginIdentifier, password) {
    if (!loginIdentifier || !password) {
      return { status: 400, success: false, message: 'Vui lòng cung cấp thông tin đăng nhập và mật khẩu' };
    }

    // Cho phép đăng nhập bằng số điện thoại hoặc email
    const customer = await Customer.findOne({
      $or: [{ phone: loginIdentifier }, { email: loginIdentifier }]
    }).select('+password');

    if (!customer) {
      return { status: 401, success: false, message: 'Tài khoản không tồn tại hoặc sai thông tin đăng nhập' };
    }

    if (!customer.isVerified) {
      return { status: 403, success: false, message: 'Vui lòng xác thực email trước khi đăng nhập' };
    }

    if (!customer.isActive) {
      return { status: 403, success: false, message: 'Tài khoản của bạn đang bị khóa' };
    }

    const isMatch = await bcrypt.compare(password, customer.password);
    if (!isMatch) {
      return { status: 401, success: false, message: 'Sai mật khẩu' };
    }

    return { status: 200, success: true, message: 'Đăng nhập thành công', user: customer, userType: 'customer' };
  }

  // Đăng nhập cho Nhân viên (Employee)
  static async employeeLogin(email, password) {
    if (!email || !password) {
      return { status: 400, success: false, message: 'Vui lòng cung cấp email và mật khẩu' };
    }

    const employee = await Employee.findOne({ email, isDeleted: false }).select('+password');
    if (!employee) {
      return { status: 401, success: false, message: 'Thông tin đăng nhập không hợp lệ' };
    }

    if (employee.status === USER_STATUS.BANNED) { // BANNED
      return { status: 403, success: false, message: 'Tài khoản của bạn đã bị khóa' };
    }

    const isMatch = await bcrypt.compare(password, employee.password);
    if (!isMatch) {
      return { status: 401, success: false, message: 'Sai thông tin đăng nhập' };
    }

    if (employee.isTwoFactorEnabled) {
      const otp = crypto.randomInt(100000, 999999).toString();
      await OTP.create({
        userId: employee._id,
        code: otp,
        type: OTP_TYPE.TWO_FACTOR,
        userModel: 'Employee'
      });

      sendEmail({
        email: employee.email,
        subject: 'Mã xác thực OTP Đăng Nhập',
        template: 'otp',
        data: { name: employee.name, otp: otp }
      }).catch(err => logger.error('Lỗi gửi OTP qua email', err));

      return {
        status: 200,
        success: true,
        requires2FA: true,
        email: employee.email,
        message: 'Vui lòng nhập mã OTP đã được gửi vào email của bạn',
      };
    }

    return { status: 200, success: true, message: 'Đăng nhập thành công', user: employee, userType: 'employee' };
  }

  static async enable2FA(employeeId) {
    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return { status: 404, success: false, message: 'Không tìm thấy nhân viên' };
    }
    
    if (employee.isTwoFactorEnabled) {
      return { status: 400, success: false, message: 'Tài khoản đã được bật 2FA từ trước' };
    }

    const otp = crypto.randomInt(100000, 999999).toString();
    await OTP.deleteMany({ userId: employee._id, type: OTP_TYPE.TWO_FACTOR, userModel: 'Employee' });
    await OTP.create({
      userId: employee._id,
      code: otp,
      type: OTP_TYPE.TWO_FACTOR,
      userModel: 'Employee'
    });

    sendEmail({
      email: employee.email,
      subject: 'Mã OTP bật tính năng 2FA',
      template: 'otp',
      data: { name: employee.name, otp: otp }
    }).catch(err => logger.error('Lỗi gửi OTP enable 2FA', err));

    return { status: 200, success: true, message: 'Mã OTP đã được gửi vào email của bạn. Vui lòng kiểm tra hộp thư.' };
  }

  static async verifyEnable2FA(employeeId, otp) {
    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return { status: 404, success: false, message: 'Không tìm thấy nhân viên' };
    }

    const otpRecord = await OTP.findOne({
      userId: employee._id,
      code: otp,
      type: OTP_TYPE.TWO_FACTOR,
      userModel: 'Employee'
    });

    if (!otpRecord) {
      return { status: 400, success: false, message: 'Mã OTP không chính xác hoặc đã hết hạn' };
    }

    await otpRecord.deleteOne();

    employee.isTwoFactorEnabled = true;
    await employee.save({ validateBeforeSave: false });

    return { status: 200, success: true, message: 'Kích hoạt bảo mật 2 lớp thành công' };
  }

  static async login2FA(email, otp) {
    if (!email || !otp) {
      return { status: 400, success: false, message: 'Vui lòng cung cấp email và mã OTP' };
    }

    const employee = await Employee.findOne({ email, isDeleted: false }).select('+password');

    if (!employee || !employee.isTwoFactorEnabled) {
      return { status: 400, success: false, message: 'Tài khoản không tồn tại hoặc chưa bật 2FA' };
    }

    const otpRecord = await OTP.findOne({
      userId: employee._id,
      code: otp,
      type: OTP_TYPE.TWO_FACTOR,
      userModel: 'Employee'
    });

    if (!otpRecord) {
      return { status: 400, success: false, message: 'Mã OTP không chính xác hoặc đã hết hạn' };
    }

    await otpRecord.deleteOne();

    return { status: 200, success: true, message: 'Đăng nhập thành công', user: employee, userType: 'employee' };
  }

  static async disable2FA(employeeId) {
    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return { status: 404, success: false, message: 'Không tìm thấy nhân viên' };
    }
    employee.isTwoFactorEnabled = false;
    await employee.save({ validateBeforeSave: false });

    await OTP.deleteMany({ userId: employee._id, type: OTP_TYPE.TWO_FACTOR, userModel: 'Employee' });

    return { status: 200, success: true, message: 'Đã tắt tính năng bảo mật 2 lớp' };
  }

  static async getMe(id) {
    let user = await Employee.findById(id).select('-password');
    let type = 'employee';
    if (!user) {
      user = await Customer.findById(id).select('-password');
      type = 'customer';
    }
    if (!user) {
      return { status: 404, success: false, message: `Không tìm thấy thông tin tài khoản với ID: ${id}` };
    }
    return { status: 200, success: true, message: 'Lấy thông tin thành công', data: user, type };
  }

  // Đăng ký cho Nhân viên (Employee) với vai trò mặc định là ADMIN
  static async employeeRegister(data) {
    const name = data.name || data.fullName;
    const { email, password } = data;

    if (!name || !name.toString().trim()) {
      return { status: 400, success: false, message: 'Họ và tên là bắt buộc' };
    }

    if (!email || !validator.isEmail(email)) {
      return { status: 400, success: false, message: 'Email không hợp lệ' };
    }

    const employeeExists = await Employee.findOne({ email, isDeleted: false });
    if (employeeExists) {
      return { status: 400, success: false, message: 'Email đã được sử dụng' };
    }

    if (!password || password.length < 6) {
      return { status: 400, success: false, message: 'Mật khẩu phải từ 6 ký tự trở lên' };
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const employee = await Employee.create({
      name,
      email,
      password: hashedPassword,
      role: 'admin', // Mặc định khi đăng ký tự do là ADMIN
    });

    return {
      status: 201,
      success: true,
      message: 'Đăng ký tài khoản Admin thành công',
      user: employee,
      userType: 'employee'
    };
  }
}

module.exports = AuthService;
