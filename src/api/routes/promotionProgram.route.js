const express = require('express');
const PromotionProgramController = require('../../controllers/promotionProgram.controller');
const { protect } = require('../../middleware/auth.middleware');
const { authorize } = require('../../middleware/authorize.middleware');
const { ROLE } = require('../../enums');

const router = express.Router();

router.post('/search', protect, PromotionProgramController.search);
router.get('/details/:id', protect, PromotionProgramController.getById);

// Quyền quản lý thuộc về Admin / Manager
router.post('/create', protect, authorize(ROLE.ADMIN), PromotionProgramController.create);
router.put('/update', protect, authorize(ROLE.ADMIN), PromotionProgramController.update);
router.delete('/delete/:id', protect, authorize(ROLE.ADMIN), PromotionProgramController.remove);
router.patch('/update-active', protect, authorize(ROLE.ADMIN), PromotionProgramController.updateActive);
router.patch('/approve', protect, authorize(ROLE.ADMIN), PromotionProgramController.approve);

module.exports = router;
