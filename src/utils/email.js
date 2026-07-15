const nodemailer = require('nodemailer');
const ejs = require('ejs');
const path = require('path');
const logger = require('../config/logger');

let transporterConfig;
if (process.env.SMTP_HOST === 'smtp.gmail.com') {
  const smtpPort = parseInt(process.env.SMTP_PORT || '465', 10);
  transporterConfig = {
    host: 'smtp.gmail.com',
    port: smtpPort,
    secure: smtpPort === 465, // true cho 465 (SSL), false cho 587 (TLS/STARTTLS)
    family: 4, // Bắt buộc sử dụng IPv4
    lookup: (hostname, options, callback) => {
      // Ép DNS lookup chỉ trả về IPv4 (khắc phục hoàn toàn lỗi ENETUNREACH)
      require('dns').lookup(hostname, { family: 4 }, (err, address, family) => {
        callback(err, address, family);
      });
    },
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: {
      rejectUnauthorized: false
    }
  };
} else {
  transporterConfig = {
    host: process.env.SMTP_HOST || 'smtp.ethereal.email',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    family: 4, // Bắt buộc sử dụng IPv4
    auth: {
      user: process.env.SMTP_USER || 'test@example.com',
      pass: process.env.SMTP_PASS || 'password',
    },
  };
}

const transporter = nodemailer.createTransport(transporterConfig);

const sendEmail = async (options) => {
  try {
    let html = options.html;
    
    if (options.template) {
      const templatePath = path.join(__dirname, '../../mails', `${options.template}.ejs`);
      html = await ejs.renderFile(templatePath, options.data || {});
    }

    const message = {
      from: `${process.env.FROM_NAME || 'Admin'} <${process.env.FROM_EMAIL || 'noreply@example.com'}>`,
      to: options.email,
      subject: options.subject,
      html: html,
    };

    const info = await transporter.sendMail(message);
    logger.info('Email sent: %s', info.messageId);
    return info;
  } catch (error) {
    logger.error('Error sending email: ', error);
    throw error;
  }
};

module.exports = sendEmail;
