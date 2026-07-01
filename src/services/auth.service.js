const crypto = require('crypto');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Employee = require('../models/employee.model');
const Customer = require('../models/customer.model');
const StaffRole = require('../models/staffRole.model');
const MembershipTier = require('../models/membershipTier.model');
const OTP = require('../models/otp.model');
const { OTP_TYPE, USER_STATUS } = require('../enums');
const sendEmail = require('../utils/email');
const logger = require('../config/logger');
const AppError = require('../utils/AppError');

class AuthService {
  static async customerRegister(data) {
    const fullName = data.fullName || data.name;
    const { phone, email, password } = data;

    const customerExists = await Customer.findOne({ phone });
    if (customerExists) {
      if (customerExists.isVerified) {
        throw new AppError('Số điện thoại đã được đăng ký', 400);
      } else {
        const otpExists = await OTP.findOne({ userId: customerExists._id, type: OTP_TYPE.REGISTER });
        if (otpExists) {
          throw new AppError('Tài khoản đang chờ xác thực, vui lòng kiểm tra mã OTP đã được gửi', 400);
        }
        await Customer.findByIdAndDelete(customerExists._id);
      }
    }

    const emailExists = await Customer.findOne({ email });
    if (emailExists) {
      if (emailExists.isVerified) {
        throw new AppError('Email đã được sử dụng', 400);
      } else {
        const otpExists = await OTP.findOne({ userId: emailExists._id, type: OTP_TYPE.REGISTER });
        if (otpExists) {
          throw new AppError('Tài khoản đang chờ xác thực, vui lòng kiểm tra mã OTP đã được gửi', 400);
        }
        await Customer.findByIdAndDelete(emailExists._id);
      }
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const customerId = Math.floor(10000000 + Math.random() * 90000000).toString();

    let defaultTierId = null;
    const lowestTier = await MembershipTier.findOne({ status: 'active' }).sort({ minPoints: 1 }).lean();
    if (lowestTier) {
      defaultTierId = lowestTier._id;
    }

    const customer = await Customer.create({
      customerId,
      fullName,
      phone,
      email,
      password: hashedPassword,
      tierId: defaultTierId,
      isActive: true,
      isVerified: false,
    });

    const otp = crypto.randomInt(100000, 999999).toString();
    await OTP.create({
      userId: customer._id,
      code: otp,
      type: OTP_TYPE.REGISTER,
      userModel: 'Customer'
    });

    sendEmail({
      email: customer.email,
      subject: 'Mã xác thực Email đăng ký tài khoản Khách hàng',
      template: 'otp',
      data: { name: customer.fullName, otp }
    }).catch(err => logger.error('Gửi email xác thực khách hàng thất bại', err));

    logger.info(`[DEV - BYPASS EMAIL] MÃ OTP ĐĂNG KÝ CỦA KHÁCH HÀNG ${customer.email} LÀ: ${otp}`);

    const populatedCustomer = await Customer.findById(customer._id).populate('tierId').lean();

    return {
      message: 'Đăng ký thành công. Vui lòng kiểm tra email để lấy mã xác thực kích hoạt tài khoản.',
      data: {
        _id: populatedCustomer._id,
        customerId: populatedCustomer.customerId,
        fullName: populatedCustomer.fullName,
        phone: populatedCustomer.phone,
        email: populatedCustomer.email,
        tierId: populatedCustomer.tierId,
      }
    };
  }

  static async customerVerifyEmail(email, otp) {
    const customer = await Customer.findOne({ email }).select('+password');
    if (!customer) throw new AppError('Tài khoản khách hàng không tồn tại', 404);
    if (customer.isVerified) throw new AppError('Tài khoản này đã được xác thực trước đó', 400);

    const otpRecord = await OTP.findOne({
      userId: customer._id,
      code: otp,
      type: OTP_TYPE.REGISTER,
      userModel: 'Customer'
    });

    if (!otpRecord) throw new AppError('Mã xác thực không chính xác hoặc đã hết hạn', 400);
    await otpRecord.deleteOne();

    customer.isVerified = true;
    await customer.save();

    return { message: 'Xác thực tài khoản thành công. Bạn đã được đăng nhập.', user: customer, userType: 'customer' };
  }

  static async customerResendVerifyEmail(email) {
    const customer = await Customer.findOne({ email });
    if (!customer) throw new AppError('Tài khoản khách hàng không tồn tại', 404);
    if (customer.isVerified) throw new AppError('Tài khoản này đã được xác thực trước đó', 400);

    const otp = crypto.randomInt(100000, 999999).toString();
    await OTP.deleteMany({ userId: customer._id, type: OTP_TYPE.REGISTER, userModel: 'Customer' });
    await OTP.create({ userId: customer._id, code: otp, type: OTP_TYPE.REGISTER, userModel: 'Customer' });

    sendEmail({
      email: customer.email,
      subject: 'Mã xác thực Email của bạn (Gửi lại)',
      template: 'otp',
      data: { name: customer.fullName, otp }
    }).catch(err => logger.error('Gửi email xác thực khách hàng thất bại (gửi lại)', err));

    logger.info(`[DEV - BYPASS EMAIL] MÃ OTP (GỬI LẠI) CỦA KHÁCH HÀNG ${customer.email} LÀ: ${otp}`);

    return { message: 'Mã xác thực mới đã được gửi vào email của bạn' };
  }

  static async customerLogin(loginIdentifier, password) {
    const customer = await Customer.findOne({
      $or: [{ phone: loginIdentifier }, { email: loginIdentifier }]
    }).select('+password').populate('tierId');

    if (!customer) throw new AppError('Tài khoản không tồn tại hoặc sai thông tin đăng nhập', 401);
    if (!customer.isVerified) throw new AppError('Vui lòng xác thực email trước khi đăng nhập', 403);
    if (!customer.isActive) throw new AppError('Tài khoản của bạn đang bị khóa', 403);

    const isMatch = await bcrypt.compare(password, customer.password);
    if (!isMatch) throw new AppError('Sai thông tin đăng nhập', 401);

    return { message: 'Đăng nhập thành công', user: customer, userType: 'customer' };
  }

  static async employeeLogin(email, password) {
    const employee = await Employee.findOne({ email, isDeleted: false }).select('+password').populate('roleId');
    if (!employee) throw new AppError('Thông tin đăng nhập không hợp lệ', 401);
    if (employee.status === USER_STATUS.BANNED) throw new AppError('Tài khoản của bạn đã bị khóa', 403);

    const isMatch = await bcrypt.compare(password, employee.password);
    if (!isMatch) throw new AppError('Sai thông tin đăng nhập', 401);

    if (employee.isTwoFactorEnabled) {
      const otp = crypto.randomInt(100000, 999999).toString();
      await OTP.deleteMany({ userId: employee._id, type: OTP_TYPE.TWO_FACTOR, userModel: 'Employee' });
      await OTP.create({ userId: employee._id, code: otp, type: OTP_TYPE.TWO_FACTOR, userModel: 'Employee' });

      sendEmail({
        email: employee.email,
        subject: 'Mã xác thực OTP Đăng Nhập',
        template: 'otp',
        data: { name: employee.name, otp }
      }).catch(err => logger.error('Lỗi gửi OTP qua email', err));

      logger.info(`[DEV - BYPASS EMAIL] MÃ OTP ĐĂNG NHẬP (2FA) CỦA NHÂN VIÊN ${employee.email} LÀ: ${otp}`);

      return {
        requires2FA: true,
        email: employee.email,
        message: 'Vui lòng nhập mã OTP đã được gửi vào email của bạn',
      };
    }

    return { message: 'Đăng nhập thành công', user: employee, userType: 'employee' };
  }

  static async enable2FA(employeeId) {
    const employee = await Employee.findById(employeeId);
    if (!employee) throw new AppError('Không tìm thấy nhân viên', 404);
    if (employee.isTwoFactorEnabled) throw new AppError('Tài khoản đã được bật 2FA từ trước', 400);

    const otp = crypto.randomInt(100000, 999999).toString();
    await OTP.deleteMany({ userId: employee._id, type: OTP_TYPE.TWO_FACTOR, userModel: 'Employee' });
    await OTP.create({ userId: employee._id, code: otp, type: OTP_TYPE.TWO_FACTOR, userModel: 'Employee' });

    sendEmail({
      email: employee.email,
      subject: 'Mã OTP bật tính năng 2FA',
      template: 'otp',
      data: { name: employee.name, otp }
    }).catch(err => logger.error('Lỗi gửi OTP enable 2FA', err));

    logger.info(`[DEV - BYPASS EMAIL] MÃ OTP BẬT 2FA CỦA NHÂN VIÊN ${employee.email} LÀ: ${otp}`);

    return { message: 'Mã OTP đã được gửi vào email của bạn. Vui lòng kiểm tra hộp thư.' };
  }

  static async verifyEnable2FA(employeeId, otp) {
    const employee = await Employee.findById(employeeId);
    if (!employee) throw new AppError('Không tìm thấy nhân viên', 404);

    const otpRecord = await OTP.findOne({ userId: employee._id, code: otp, type: OTP_TYPE.TWO_FACTOR, userModel: 'Employee' });
    if (!otpRecord) throw new AppError('Mã OTP không chính xác hoặc đã hết hạn', 400);

    await otpRecord.deleteOne();
    employee.isTwoFactorEnabled = true;
    await employee.save({ validateBeforeSave: false });

    return { message: 'Kích hoạt bảo mật 2 lớp thành công' };
  }

  static async login2FA(email, otp) {
    const employee = await Employee.findOne({ email, isDeleted: false }).select('+password').populate('roleId');
    if (!employee || !employee.isTwoFactorEnabled) throw new AppError('Tài khoản không tồn tại hoặc chưa bật 2FA', 400);

    const otpRecord = await OTP.findOne({ userId: employee._id, code: otp, type: OTP_TYPE.TWO_FACTOR, userModel: 'Employee' });
    if (!otpRecord) throw new AppError('Mã OTP không chính xác hoặc đã hết hạn', 400);

    await otpRecord.deleteOne();
    return { message: 'Đăng nhập thành công', user: employee, userType: 'employee' };
  }

  static async disable2FA(employeeId) {
    const employee = await Employee.findById(employeeId);
    if (!employee) throw new AppError('Không tìm thấy nhân viên', 404);
    
    employee.isTwoFactorEnabled = false;
    await employee.save({ validateBeforeSave: false });
    await OTP.deleteMany({ userId: employee._id, type: OTP_TYPE.TWO_FACTOR, userModel: 'Employee' });

    return { message: 'Đã tắt tính năng bảo mật 2 lớp' };
  }

  static async getMe(id) {
    let user = await Employee.findById(id).select('-password').populate('roleId').lean();
    let type = 'employee';
    if (!user) {
      user = await Customer.findById(id).select('-password').populate('tierId').lean();
      type = 'customer';
    }
    if (!user) throw new AppError(`Không tìm thấy thông tin tài khoản với ID: ${id}`, 404);
    
    return { message: 'Lấy thông tin thành công', data: user, type };
  }

  static async employeeRegister(data) {
    const name = data.name || data.fullName;
    const { email, password } = data;

    const employeeExists = await Employee.findOne({ email, isDeleted: false });
    if (employeeExists) throw new AppError('Email đã được sử dụng', 400);

    let adminRole = await StaffRole.findOne({ code: 'admin' });
    if (!adminRole) {
      adminRole = await StaffRole.create({ name: 'Admin', code: 'admin', permissions: [], description: 'Quản trị viên hệ thống' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const employee = await Employee.create({
      name,
      email,
      password: hashedPassword,
      roleId: adminRole._id,
    });

    const populatedEmployee = await Employee.findById(employee._id).populate('roleId').lean();

    return { message: 'Đăng ký tài khoản Admin thành công', user: populatedEmployee, userType: 'employee' };
  }

  static async forgotPassword(email) {
    const employee = await Employee.findOne({ email, isDeleted: false });
    if (!employee) throw new AppError('Không tìm thấy tài khoản với email này', 404);

    const otp = crypto.randomInt(100000, 999999).toString();
    const activationSecret = process.env.ACTIVATION_SECRET || 'activation_secret_123';
    const activationToken = jwt.sign({ email: employee.email, otp }, activationSecret, { expiresIn: '5m' });

    await sendEmail({
      email: employee.email,
      subject: 'Mã xác thực khôi phục mật khẩu',
      template: 'reset-password',
      data: { name: employee.name, otp }
    }).catch(err => logger.error('Lỗi gửi OTP reset password', err));

    logger.info(`[DEV - BYPASS EMAIL] MÃ OTP KHÔI PHỤC MẬT KHẨU CỦA ${employee.email} LÀ: ${otp}`);

    return { activationToken, message: 'Mã OTP khôi phục mật khẩu đã được gửi đến email của bạn.' };
  }

  static async verifyOtpCode(activation_token, activation_code) {
    const activationSecret = process.env.ACTIVATION_SECRET || 'activation_secret_123';
    let decoded;
    try {
      decoded = jwt.verify(activation_token, activationSecret);
    } catch (err) {
      if (err.name === 'TokenExpiredError') throw new AppError('Mã OTP đã hết hạn', 400);
      throw new AppError('Mã xác thực không hợp lệ', 400);
    }

    if (decoded.otp !== activation_code) throw new AppError('Mã OTP không chính xác', 400);

    const employee = await Employee.findOne({ email: decoded.email, isDeleted: false });
    if (!employee) throw new AppError('Không tìm thấy tài khoản nhân viên', 404);

    const resetToken = crypto.randomBytes(20).toString('hex');
    employee.resetPasswordToken = resetToken;
    employee.resetPasswordTokenExpire = Date.now() + 10 * 60 * 1000;
    await employee.save({ validateBeforeSave: false });

    return { email: employee.email, resetToken, message: 'OTP đã được xác minh thành công' };
  }

  static async resetPassword(resetToken, newPassword) {
    const employee = await Employee.findOne({
      resetPasswordToken: resetToken,
      resetPasswordTokenExpire: { $gt: Date.now() }
    }).select('+password');

    if (!employee) throw new AppError('Reset token không hợp lệ hoặc đã hết hạn. Vui lòng thử lại.', 400);

    const isSame = await bcrypt.compare(newPassword, employee.password);
    if (isSame) throw new AppError('Mật khẩu mới không được trùng với mật khẩu cũ', 400);

    const salt = await bcrypt.genSalt(10);
    employee.password = await bcrypt.hash(newPassword, salt);

    employee.resetPasswordToken = undefined;
    employee.resetPasswordTokenExpire = undefined;
    employee.loginAttempts = 0;
    employee.lockUntil = undefined;
    
    await employee.save({ validateBeforeSave: false });

    return { message: 'Mật khẩu đã được đặt lại thành công' };
  }

  static async changePassword(userId, currentPassword, newPassword) {
    let user = await Employee.findById(userId).select('+password');
    if (!user) {
      user = await Customer.findById(userId).select('+password');
    }
    if (!user) throw new AppError('Không tìm thấy tài khoản người dùng', 404);

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) throw new AppError('Mật khẩu hiện tại không chính xác', 400);

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save({ validateBeforeSave: false });

    return { message: 'Đổi mật khẩu thành công' };
  }
}

module.exports = AuthService;
