const nodemailer = require('nodemailer');
const ejs = require('ejs');
const path = require('path');
const logger = require('../config/logger');

let transporterConfig;
if (process.env.SMTP_HOST === 'smtp.gmail.com') {
  transporterConfig = {
    host: 'smtp.gmail.com',
    port: 465,
    secure: true, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: {
      rejectUnauthorized: false // Bỏ qua lỗi SSL trên một số môi trường cloud như Render
    }
  };
} else {
  transporterConfig = {
    host: process.env.SMTP_HOST || 'smtp.ethereal.email',
    port: process.env.SMTP_PORT || 587,
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
