const express = require('express');
const { exportUsersToExcel } = require('../../utils/excel');
const UserService = require('../../services/user.service');
const { protect } = require('../../middleware/auth.middleware');
const { authorize } = require('../../middleware/authorize.middleware');
const { ROLE } = require('../../enums');

const router = express.Router();

router.get('/users', protect, authorize(ROLE.ADMIN), async (req, res, next) => {
    try {
        const users = await UserService.getAllUsers();
        await exportUsersToExcel(users, res);
    } catch (error) {
        next(error);
    }
});

module.exports = router;
