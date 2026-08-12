const express = require('express');
const VoucherController = require('../../controllers/voucher.controller');
const { protect } = require('../../middleware/auth.middleware');

const router = express.Router();

router.post('/validate', VoucherController.validate);
router.post('/validate-wallet', protect, VoucherController.validateWallet);

router.get('/redeemable', protect, VoucherController.getRedeemable);
router.post('/:id/redeem', protect, VoucherController.redeem);

router.get('/search', protect, VoucherController.getAll);
router.post('/create', protect, VoucherController.create);
router.get('/:id/detail', protect, VoucherController.getById);
router.put('/:id/update', protect, VoucherController.update);
router.delete('/:id/delete', protect, VoucherController.remove);

module.exports = router;
