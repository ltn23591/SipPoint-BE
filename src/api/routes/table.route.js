const express = require('express');
const TableController = require('../../controllers/table.controller');
const { protect } = require('../../middleware/auth.middleware');
const { authorize } = require('../../middleware/authorize.middleware');
const { ROLE } = require('../../enums');

const router = express.Router();

// Lấy danh sách (Public) / Tạo mới (Admin)
router.route('/')
  .get(TableController.getAll)
  .post(protect, authorize(ROLE.ADMIN), TableController.create);

// Khách tại bàn gọi nhân viên / yêu cầu hỗ trợ qua QR
router.post('/assist', TableController.requestAssistance);
router.post('/:id/assist', TableController.requestAssistance);

// Lấy chi tiết (Public) / Cập nhật (Staff) / Xóa (Admin)
router.route('/:id')
  .get(TableController.getById)
  .put(protect, authorize(ROLE.ADMIN, ROLE.CASHIER, ROLE.WAITER, ROLE.BARISTA), TableController.update)
  .delete(protect, authorize(ROLE.ADMIN), TableController.remove);

// Admin can regenerate QR codes
router.post(
  '/:id/qrcode',
  protect,
  authorize(ROLE.ADMIN),
  TableController.generateQRCode
);

module.exports = router;
