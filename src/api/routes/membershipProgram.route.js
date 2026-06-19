const express = require('express');
const MembershipProgramController = require('../../controllers/membershipProgram.controller');
const { protect } = require('../../middleware/auth.middleware');
const { authorize } = require('../../middleware/authorize.middleware');
const { ROLE } = require('../../enums');

const router = express.Router();

router.get('/details/current', protect, MembershipProgramController.getCurrent);
router.get('/details/:id', protect, MembershipProgramController.getById);
router.post('/search', protect, MembershipProgramController.search);

// Admin / Manager mới được tạo, sửa, duyệt chương trình thành viên
router.post('/create', protect, authorize(ROLE.ADMIN), MembershipProgramController.create);
router.put('/update', protect, authorize(ROLE.ADMIN), MembershipProgramController.update);
router.patch('/approve', protect, authorize(ROLE.ADMIN), MembershipProgramController.approve);

module.exports = router;
