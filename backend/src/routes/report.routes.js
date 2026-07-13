const express = require('express');
const router = express.Router();
const reportController = require('../controllers/report.controller');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const { multiTenant } = require('../middleware/multiTenant');

router.use(authenticate);
router.use(multiTenant);
router.use(authorize('shop_admin', 'manager'));

router.get('/sales', reportController.getSalesReport);
router.get('/inventory', reportController.getInventoryReport);
router.get('/gst', reportController.getGstReport);
router.get('/profit-loss', reportController.getProfitLoss);
router.get('/customers', reportController.getCustomerReport);

module.exports = router;
