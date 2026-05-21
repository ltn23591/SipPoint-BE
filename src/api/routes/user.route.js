const express = require('express');
// validation moved out of route
const {
    getUsers,
    getUser,
    createUser,
    updateUser,
    deleteUser,
} = require('../../controllers/user.controller');
const { protect } = require('../../middleware/auth.middleware');
const { authorize } = require('../../middleware/authorize.middleware');
const { ROLE } = require('../../enums');

const router = express.Router();

// Bắt buộc đăng nhập và là admin cho tất cả các routes của users
router.use(protect);
router.use(authorize(ROLE.ADMIN));

router.get('/search', getUsers);

router.post('/create', createUser);

router.get('/:id/detail', getUser);

router.put('/:id/update', updateUser);

router.delete('/:id/delete', deleteUser);

module.exports = router;
