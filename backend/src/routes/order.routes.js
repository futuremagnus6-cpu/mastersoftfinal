const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const orderController = require('../controllers/order.controller');
const { authenticate } = require('../middleware/auth');
const { authorizePermission } = require('../middleware/rbac');
const { multiTenant } = require('../middleware/multiTenant');
const {
  createOrderValidator,
  updateOrderValidator,
  cancelOrderValidator,
  syncOfflineOrdersValidator,
} = require('../validators/order.validators');

router.use(authenticate);
router.use(multiTenant);

router.param('id', (req, res, next, val) => {
  if (!mongoose.Types.ObjectId.isValid(val)) {
    return res.status(400).json({ success: false, message: 'Invalid ID format', code: 'INVALID_ID' });
  }
  next();
});

router.get('/today/summary', authorizePermission('orders', 'read'), orderController.getTodaySummary);
router.post('/sync-offline', authorizePermission('orders', 'create'), syncOfflineOrdersValidator, orderController.syncOfflineOrders);

router.route('/')
  .get(authorizePermission('orders', 'read'), orderController.getOrders)
  .post(authorizePermission('orders', 'create'), createOrderValidator, orderController.createOrder);

router.route('/:id')
  .get(authorizePermission('orders', 'read'), orderController.getOrder)
  .put(authorizePermission('orders', 'update'), updateOrderValidator, orderController.updateOrder);

router.put('/:id/cancel', authorizePermission('orders', 'update'), cancelOrderValidator, orderController.cancelOrder);
router.post('/:id/generate-invoice', authorizePermission('orders', 'read'), orderController.generateInvoice);

module.exports = router;
