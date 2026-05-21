const express = require('express');

const { register, login, logout, getMe, enable2FA, verifyEnable2FA, login2FA, disable2FA, verifyEmail, resendVerifyEmail } = require('../../controllers/auth.controller');
const { protect } = require('../../middleware/auth.middleware');

const router = express.Router();

router.post('/register', register);

router.post('/verify-email', verifyEmail);

router.post('/resend-verify-email', resendVerifyEmail);

router.post('/login', login);

router.get('/logout', logout);

router.get('/me', protect, getMe);

router.post('/2fa/enable', protect, enable2FA);

router.post('/2fa/verify-enable', protect, verifyEnable2FA);

router.post('/2fa/login', login2FA);

router.post('/2fa/disable', protect, disable2FA);

module.exports = router;
