const express = require('express');
const { exportEmployeesToExcel } = require('../../utils/excel');
const EmployeeService = require('../../services/employee.service');
const { protect } = require('../../middleware/auth.middleware');
const { authorize } = require('../../middleware/authorize.middleware');
const { ROLE } = require('../../enums');

const router = express.Router();

router.get('/employees', protect, authorize(ROLE.ADMIN), async (req, res, next) => {
    try {
        const result = await EmployeeService.getAllEmployees();
        await exportEmployeesToExcel(result.data, res);
    } catch (error) {
        next(error);
    }
});

module.exports = router;
