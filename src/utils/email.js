const ejs = require('ejs');
const path = require('path');
const logger = require('../config/logger');
// const nodemailer = require('nodemailer'); // Không dùng nữa do lỗi Render chặn SMTP

const sendEmail = async (options) => {
  try {
    let html = options.html;
    
    if (options.template) {
      const templatePath = path.join(__dirname, '../../mails', `${options.template}.ejs`);
      html = await ejs.renderFile(templatePath, options.data || {});
    }

    // Cấu hình payload cho Brevo API
    const payload = {
      sender: {
        name: process.env.FROM_NAME || 'Admin',
        email: process.env.FROM_EMAIL || 'noreply@example.com'
      },
      to: [
        {
          email: options.email
        }
      ],
      subject: options.subject,
      htmlContent: html
    };

    // Gửi request qua HTTP API (port 443) để không bị Render chặn
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': process.env.BREVO_API_KEY,
        'content-type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(`Brevo API Error: ${JSON.stringify(data)}`);
    }

    logger.info('Email sent via Brevo API: %s', data.messageId || 'Success');
    return data;
  } catch (error) {
    logger.error('Error sending email: ', error);
    throw error;
  }
};

module.exports = sendEmail;
