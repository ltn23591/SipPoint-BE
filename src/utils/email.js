const ejs = require('ejs');
const path = require('path');
const logger = require('../config/logger');

const sendEmail = async (options) => {
  try {
    let html = options.html;
    
    if (options.template) {
      const templatePath = path.join(__dirname, '../../mails', `${options.template}.ejs`);
      html = await ejs.renderFile(templatePath, options.data || {});
    }

    // Cấu hình payload cho Google Apps Script API
    const payload = {
      to: options.email,
      subject: options.subject,
      htmlContent: html,
      senderName: process.env.FROM_NAME || 'SipPoint'
    };

    const GOOGLE_SCRIPT_URL = process.env.GOOGLE_SCRIPT_EMAIL_URL || 'https://script.google.com/macros/s/AKfycbwtPr-yU4C2fLOAsyKSticy9E8OlVoFpSp8iGRLsIR3q-Ow0lc_028Iw1aFTCtabsQI/exec';

    // Gửi request qua Google Apps Script Web App
    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json' // Không được dùng 'accept' hoặc các header phức tạp vì GAS không hỗ trợ CORS preflight phức tạp
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (data.status !== 'success') {
      throw new Error(`Google Apps Script Error: ${JSON.stringify(data)}`);
    }

    logger.info('Email sent via Google Apps Script API to: %s', options.email);
    return data;
  } catch (error) {
    logger.error('Error sending email: ', error);
    throw error;
  }
};

module.exports = sendEmail;
