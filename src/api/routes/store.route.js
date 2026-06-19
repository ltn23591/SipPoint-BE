const express = require('express');
const StoreController = require('../../controllers/store.controller');
const { protect } = require('../../middleware/auth.middleware');
const { authorize } = require('../../middleware/authorize.middleware');
const { ROLE } = require('../../enums');

const router = express.Router();

router.get('/all', StoreController.getAll);
router.get('/details/:id', StoreController.getById);
router.post('/search', StoreController.search);

// Cần xác thực và phân quyền để quản trị cửa hàng
router.post('/create', protect, authorize(ROLE.ADMIN), StoreController.create);
router.put('/update', protect, authorize(ROLE.ADMIN), StoreController.update);
router.delete('/delete/:id', protect, authorize(ROLE.ADMIN), StoreController.remove);

module.exports = router;
