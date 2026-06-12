const express = require('express');
const {
    getEmployees,
    getEmployee,
    createEmployee,
    updateEmployee,
    deleteEmployee,
} = require('../../controllers/employee.controller');
const { protect } = require('../../middleware/auth.middleware');
const { authorize } = require('../../middleware/authorize.middleware');
const { ROLE } = require('../../enums');

const router = express.Router();

// Bắt buộc đăng nhập và là admin cho tất cả các routes của nhân viên
router.use(protect);
router.use(authorize(ROLE.ADMIN));

router.get('/', getEmployees);

router.post('/', createEmployee);

router.get('/:id', getEmployee);

router.put('/:id', updateEmployee);

router.delete('/:id', deleteEmployee);

module.exports = router;
