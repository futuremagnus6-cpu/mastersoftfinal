const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const purchaseController = require('../controllers/purchase.controller');
const { authenticate } = require('../middleware/auth');
const { authorizePermission } = require('../middleware/rbac');
const { multiTenant } = require('../middleware/multiTenant');
const { requireFeature } = require('../middleware/featureCheck');
const {
  createPurchaseValidator,
  updatePurchaseValidator,
  receivePurchaseValidator,
} = require('../validators/supplier.validators');

router.use(authenticate);
router.use(multiTenant);
router.use(requireFeature('purchases'));

router.param('id', (req, res, next, val) => {
  if (!mongoose.Types.ObjectId.isValid(val)) {
    return res.status(400).json({ success: false, message: 'Invalid ID format', code: 'INVALID_ID' });
  }
  next();
});

router.route('/')
  .get(authorizePermission('purchases', 'read'), purchaseController.getPurchases)
  .post(authorizePermission('purchases', 'create'), createPurchaseValidator, purchaseController.createPurchase);

router.route('/:id')
  .get(authorizePermission('purchases', 'read'), purchaseController.getPurchase)
  .put(authorizePermission('purchases', 'update'), updatePurchaseValidator, purchaseController.updatePurchase);

router.put('/:id/receive', authorizePermission('purchases', 'update'), receivePurchaseValidator, purchaseController.receivePurchase);

module.exports = router;
