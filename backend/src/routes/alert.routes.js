const express = require('express');
const router = express.Router();
const alertController = require('../controllers/alert.controller');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const { multiTenant } = require('../middleware/multiTenant');
const {
  updateAlertValidator,
  toggleAlertValidator,
} = require('../validators/remaining.validators');

router.use(authenticate);
router.use(multiTenant);

router.get('/', alertController.getAlerts);
router.get('/:type', alertController.getAlert);
router.put('/:type', authorize('shop_admin', 'manager'), updateAlertValidator, alertController.updateAlert);
router.patch('/:type/toggle', authorize('shop_admin', 'manager'), toggleAlertValidator, alertController.toggleAlert);

module.exports = router;
