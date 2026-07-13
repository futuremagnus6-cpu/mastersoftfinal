const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const loyaltyController = require('../controllers/loyalty.controller');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const { multiTenant } = require('../middleware/multiTenant');
const { requireFeature } = require('../middleware/featureCheck');
const {
  createTierValidator,
  updateTierValidator,
  createLoyaltyTransactionValidator,
  updateLoyaltySettingsValidator,
} = require('../validators/customer.validators');

router.use(authenticate);
router.use(multiTenant);
router.use(requireFeature('loyalty'));

router.param('id', (req, res, next, val) => {
  if (!mongoose.Types.ObjectId.isValid(val)) {
    return res.status(400).json({ success: false, message: 'Invalid ID format', code: 'INVALID_ID' });
  }
  next();
});

router.param('customerId', (req, res, next, val) => {
  if (!mongoose.Types.ObjectId.isValid(val)) {
    return res.status(400).json({ success: false, message: 'Invalid customer ID format', code: 'INVALID_ID' });
  }
  next();
});

// Tiers
router.get('/tiers', loyaltyController.getTiers);
router.post('/tiers', authorize('shop_admin'), createTierValidator, loyaltyController.createTier);
router.put('/tiers/:id', authorize('shop_admin'), updateTierValidator, loyaltyController.updateTier);
router.delete('/tiers/:id', authorize('shop_admin'), loyaltyController.deleteTier);

// Transactions
router.get('/transactions', loyaltyController.getTransactions);
router.post('/transactions', authorize('shop_admin', 'manager'), createLoyaltyTransactionValidator, loyaltyController.createTransaction);

// Customer balance & stats
router.get('/balance/:customerId', loyaltyController.getCustomerBalance);
router.get('/customer-stats/:customerId', loyaltyController.getCustomerStats);

// Auto-earn points from order
router.post('/earn-from-order', authorize('shop_admin', 'manager'), loyaltyController.earnFromOrder);

// Settings
router.get('/settings', loyaltyController.getSettings);
router.put('/settings', authorize('shop_admin'), updateLoyaltySettingsValidator, loyaltyController.updateSettings);

module.exports = router;
