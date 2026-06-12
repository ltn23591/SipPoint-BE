const express = require('express');
const CustomerRankController = require('../../controllers/customerRank.controller');
const { protect } = require('../../middleware/auth.middleware');
const { authorize } = require('../../middleware/authorize.middleware');
const { ROLE } = require('../../enums');

const router = express.Router();

// Public: Ai cũng có thể xem danh sách hạng thẻ (dùng cho trang loyalty)
router.get('/', CustomerRankController.getAll);

// Admin-only: Chỉ Admin mới được tạo, sửa, xóa hạng thẻ
router.post('/', protect, authorize(ROLE.ADMIN), CustomerRankController.create);
router.put('/:id', protect, authorize(ROLE.ADMIN), CustomerRankController.update);
router.delete('/:id', protect, authorize(ROLE.ADMIN), CustomerRankController.delete);

module.exports = router;
