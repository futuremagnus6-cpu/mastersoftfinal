const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const customerController = require('../controllers/customer.controller');
const { authenticate } = require('../middleware/auth');
const { authorizePermission } = require('../middleware/rbac');
const { multiTenant } = require('../middleware/multiTenant');
const { requireFeature } = require('../middleware/featureCheck');
const {
  createCustomerValidator,
  updateCustomerValidator,
  addLoyaltyPointsValidator,
  redeemLoyaltyPointsValidator,
  recordCreditPaymentValidator,
} = require('../validators/customer.validators');

router.use(authenticate);
router.use(multiTenant);
router.use(requireFeature('crm'));

router.param('id', (req, res, next, val) => {
  if (!mongoose.Types.ObjectId.isValid(val)) {
    return res.status(400).json({ success: false, message: 'Invalid ID format', code: 'INVALID_ID' });
  }
  next();
});

router.get('/search', authorizePermission('customers', 'read'), customerController.searchCustomers);

router.route('/')
  .get(authorizePermission('customers', 'read'), customerController.getCustomers)
  .post(authorizePermission('customers', 'create'), createCustomerValidator, customerController.createCustomer);

router.route('/:id')
  .get(authorizePermission('customers', 'read'), customerController.getCustomer)
  .put(authorizePermission('customers', 'update'), updateCustomerValidator, customerController.updateCustomer)
  .delete(authorizePermission('customers', 'delete'), customerController.deleteCustomer);

router.post('/:id/loyalty/add', authorizePermission('customers', 'update'), addLoyaltyPointsValidator, customerController.addLoyaltyPoints);
router.post('/:id/loyalty/redeem', authorizePermission('customers', 'update'), redeemLoyaltyPointsValidator, customerController.redeemLoyaltyPoints);
router.post('/:id/credit/pay', authorizePermission('customers', 'update'), recordCreditPaymentValidator, customerController.recordCreditPayment);

module.exports = router;
