const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analytics.controller');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const { multiTenant } = require('../middleware/multiTenant');

router.use(authenticate);
router.use(multiTenant);

router.get('/revenue', authorize('shop_admin', 'manager'), analyticsController.getRevenueAnalytics);
router.get('/products', authorize('shop_admin', 'manager'), analyticsController.getProductAnalytics);
router.get('/customers', authorize('shop_admin', 'manager'), analyticsController.getCustomerAnalytics);
router.get('/system-health', authorize('super_admin'), analyticsController.getSystemHealth);

module.exports = router;
