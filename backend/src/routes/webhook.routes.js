const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const webhookController = require('../controllers/webhook.controller');
const { authenticate } = require('../middleware/auth');
const { authorize, authorizePermission } = require('../middleware/rbac');
const { multiTenant } = require('../middleware/multiTenant');
const {
  createWebhookValidator,
  updateWebhookValidator,
} = require('../validators/remaining.validators');

router.use(authenticate);
router.use(multiTenant);

router.param('id', (req, res, next, val) => {
  if (!mongoose.Types.ObjectId.isValid(val)) {
    return res.status(400).json({ success: false, message: 'Invalid ID format', code: 'INVALID_ID' });
  }
  next();
});

router.route('/')
  .get(authorizePermission('webhooks', 'read'), webhookController.getWebhooks)
  .post(authorizePermission('webhooks', 'create'), createWebhookValidator, webhookController.createWebhook);

router.route('/:id')
  .get(authorizePermission('webhooks', 'read'), webhookController.getWebhook)
  .put(authorizePermission('webhooks', 'update'), updateWebhookValidator, webhookController.updateWebhook)
  .delete(authorizePermission('webhooks', 'delete'), webhookController.deleteWebhook);

router.put('/:id/toggle', authorize('shop_admin', 'manager'), webhookController.toggleWebhook);
router.post('/:id/test', authorize('shop_admin', 'manager'), webhookController.testWebhook);

module.exports = router;
