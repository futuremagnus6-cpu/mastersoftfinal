const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/payment.controller');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const { multiTenant } = require('../middleware/multiTenant');
const {
  createPaymentOrderValidator,
  verifyPaymentValidator,
  extendSubscriptionValidator,
  cancelSubscriptionValidator,
} = require('../validators/payment.validators');

router.post('/razorpay/webhook', paymentController.razorpayWebhook);

// Create payment order (authenticated - shop_admin or super_admin)
router.post('/create-order', authenticate, createPaymentOrderValidator, multiTenant, authorize('shop_admin', 'super_admin'), paymentController.createOrder);

// Verify payment (authenticated)
router.post('/verify', authenticate, verifyPaymentValidator, multiTenant, authorize('shop_admin', 'super_admin'), paymentController.verifyPayment);

// Get subscription & billing info (authenticated)
router.get('/subscription', authenticate, multiTenant, authorize('shop_admin', 'super_admin'), paymentController.getSubscription);

// Payment transaction history (authenticated)
router.get('/transactions', authenticate, multiTenant, authorize('shop_admin', 'super_admin'), paymentController.getPaymentTransactions);

// Download/read subscription invoice details
router.get('/transactions/:id/invoice', authenticate, multiTenant, authorize('shop_admin', 'super_admin'), paymentController.getInvoice);

// Extend subscription (authenticated)
router.post('/extend', authenticate, extendSubscriptionValidator, multiTenant, authorize('shop_admin', 'super_admin'), paymentController.extendSubscription);

// Cancel current subscription
router.post('/cancel', authenticate, cancelSubscriptionValidator, multiTenant, authorize('shop_admin', 'super_admin'), paymentController.cancelSubscription);

// Admin billing analytics and logs
router.get('/admin', authenticate, authorize('super_admin'), paymentController.getAdminBilling);

module.exports = router;
