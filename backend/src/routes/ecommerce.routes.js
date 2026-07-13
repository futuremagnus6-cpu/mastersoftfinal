const express = require('express');
const router = express.Router();
const ecommerceController = require('../controllers/ecommerce.controller');
const { authenticate } = require('../middleware/auth');
const { multiTenant } = require('../middleware/multiTenant');
const { requireFeature } = require('../middleware/featureCheck');
const {
  createOnlineOrderValidator,
} = require('../validators/remaining.validators');

// Public routes (no auth needed for storefront)
router.get('/products', ecommerceController.getOnlineProducts);
router.get('/products/:id', ecommerceController.getOnlineProduct);
router.get('/check-pincode/:pincode', ecommerceController.checkPincode);

// Protected routes
router.post('/orders', authenticate, createOnlineOrderValidator, multiTenant, requireFeature('ecommerce'), ecommerceController.createOnlineOrder);

module.exports = router;
