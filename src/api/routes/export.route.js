const express = require('express');
const { exportUsersToExcel } = require('../../utils/excel');
const UserService = require('../../services/user.service');
const { protect } = require('../../middleware/auth.middleware');
const { authorize } = require('../../middleware/authorize.middleware');
const { ROLE } = require('../../enums/role.enum');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Exports
 *   description: API Xuất dữ liệu
 */

/**
 * @swagger
 * /api/v1/export/users:
 *   get:
 *     summary: Xuất danh sách người dùng ra Excel
 *     tags: [Exports]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: File excel
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 */
router.get('/users', protect, authorize(ROLE.ADMIN), async (req, res, next) => {
    try {
        const users = await UserService.getAllUsers();
        await exportUsersToExcel(users, res);
    } catch (error) {
        next(error);
    }
});

module.exports = router;
