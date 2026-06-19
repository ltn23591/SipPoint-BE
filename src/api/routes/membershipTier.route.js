const express = require('express');
const MembershipTierController = require('../../controllers/membershipTier.controller');
const { protect } = require('../../middleware/auth.middleware');
const { authorize } = require('../../middleware/authorize.middleware');
const { ROLE } = require('../../enums');

const router = express.Router();

router.get('/all/current', protect, MembershipTierController.getCurrentTiers);
router.get('/all/:programId', protect, MembershipTierController.getByProgramId);
router.get('/detail/:id', protect, MembershipTierController.getById);
router.post('/search', protect, MembershipTierController.search);

// Admin mới được tạo/sửa đổi hạng thành viên
router.post('/create', protect, authorize(ROLE.ADMIN), MembershipTierController.create);
router.put('/update', protect, authorize(ROLE.ADMIN), MembershipTierController.update);

module.exports = router;
