const express = require('express');
const ReportController = require('../../controllers/report.controller');
const { protect } = require('../../middleware/auth.middleware');
const { authorize } = require('../../middleware/authorize.middleware');
const { ROLE } = require('../../enums');

const router = express.Router();

router.get('/dashboard', protect, authorize(ROLE.ADMIN), ReportController.dashboard);
router.get('/revenue', protect, authorize(ROLE.ADMIN), ReportController.revenue);
router.get('/top-products', protect, authorize(ROLE.ADMIN), ReportController.topProducts);
router.get('/material-consumption', protect, authorize(ROLE.ADMIN), ReportController.materialConsumption);
router.get('/material-consumption-series', protect, authorize(ROLE.ADMIN), ReportController.materialConsumptionSeries);
router.get('/inventory-dashboard', protect, authorize(ROLE.ADMIN), ReportController.inventoryDashboard);
router.post('/export/material-consumption', protect, authorize(ROLE.ADMIN), ReportController.exportMaterialConsumption);

router.post('/export/revenue', protect, authorize(ROLE.ADMIN), ReportController.exportRevenue);
router.post('/export/orders', protect, authorize(ROLE.ADMIN), ReportController.exportOrders);
router.post('/export/customers', protect, authorize(ROLE.ADMIN), ReportController.exportCustomers);

module.exports = router;
