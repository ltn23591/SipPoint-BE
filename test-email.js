require('dotenv').config();
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function test() {
  try {
    console.log('Testing SMTP connection with:', process.env.SMTP_USER);
    await transporter.verify();
    console.log('Connection successful!');
  } catch (error) {
    console.error('Connection failed:', error.message);
  }
}

test();
