const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboard.controller');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const { multiTenant } = require('../middleware/multiTenant');

router.use(authenticate);

router.get('/shop', multiTenant, authorize('shop_admin', 'manager', 'staff'), dashboardController.getShopDashboard);
router.get('/super-admin', authorize('super_admin'), dashboardController.getSuperAdminDashboard);

module.exports = router;
