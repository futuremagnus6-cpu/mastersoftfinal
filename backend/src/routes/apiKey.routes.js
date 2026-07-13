const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const apiKeyController = require('../controllers/apiKey.controller');
const { authenticate } = require('../middleware/auth');
const { authorize, authorizePermission } = require('../middleware/rbac');
const { multiTenant } = require('../middleware/multiTenant');
const {
  createApiKeyValidator,
  updateApiKeyValidator,
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
  .get(authorizePermission('apiKeys', 'read'), apiKeyController.getApiKeys)
  .post(authorizePermission('apiKeys', 'create'), createApiKeyValidator, apiKeyController.createApiKey);

router.route('/:id')
  .get(authorizePermission('apiKeys', 'read'), apiKeyController.getApiKey)
  .put(authorizePermission('apiKeys', 'update'), updateApiKeyValidator, apiKeyController.updateApiKey)
  .delete(authorizePermission('apiKeys', 'delete'), apiKeyController.deleteApiKey);

router.post('/:id/regenerate', authorize('shop_admin'), apiKeyController.regenerateApiKey);

module.exports = router;
