const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventory.controller');
const { authenticate } = require('../middleware/auth');
const { authorizePermission } = require('../middleware/rbac');
const { multiTenant } = require('../middleware/multiTenant');
const { requireFeature } = require('../middleware/featureCheck');
const {
  createStockTransferValidator,
} = require('../validators/product.validators');

router.use(authenticate);
router.use(multiTenant);
router.use(requireFeature('inventory'));

router.get('/logs', authorizePermission('inventory', 'read'), inventoryController.getInventoryLogs);
router.get('/summary', authorizePermission('inventory', 'read'), inventoryController.getStockSummary);
router.get('/expiring', authorizePermission('inventory', 'read'), inventoryController.getExpiringProducts);

router.get('/transfers', authorizePermission('inventory', 'read'), inventoryController.getStockTransfers);
router.post('/transfers', authorizePermission('inventory', 'create'), createStockTransferValidator, inventoryController.createStockTransfer);
router.put('/transfers/:id/receive', authorizePermission('inventory', 'update'), inventoryController.receiveTransfer);

module.exports = router;
