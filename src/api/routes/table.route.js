const express = require('express');
const TableController = require('../../controllers/table.controller');
const { protect } = require('../../middleware/auth.middleware');
const { authorize } = require('../../middleware/authorize.middleware');
const { ROLE } = require('../../enums');

const router = express.Router();

// Public / Authenticated views
router.get('/', TableController.getAll);
router.get('/:id', TableController.getById);

// Admin-only creation and deletion
router.post('/', protect, authorize(ROLE.ADMIN), TableController.create);
router.delete('/:id', protect, authorize(ROLE.ADMIN), TableController.remove);

// Staff and Admin can update tables (status updates)
router.put(
  '/:id',
  protect,
  authorize(ROLE.ADMIN, ROLE.CASHIER, ROLE.WAITER, ROLE.BARISTA),
  TableController.update
);

// Admin can regenerate QR codes
router.post(
  '/:id/qrcode',
  protect,
  authorize(ROLE.ADMIN),
  TableController.generateQRCode
);

module.exports = router;
