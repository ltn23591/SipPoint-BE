const express = require('express');
const VoucherController = require('../../controllers/voucher.controller');
const { protect } = require('../../middleware/auth.middleware');

const router = express.Router();

router.post('/validate', VoucherController.validate);

// Các API quản lý voucher yêu cầu đăng nhập
router.get('/search', protect, VoucherController.getAll);
router.post('/create', protect, VoucherController.create);
router.get('/:id/detail', protect, VoucherController.getById);
router.put('/:id/update', protect, VoucherController.update);
router.delete('/:id/delete', protect, VoucherController.remove);

module.exports = router;
