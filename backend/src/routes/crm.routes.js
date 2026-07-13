const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const crmController = require('../controllers/crm.controller');
const { authenticate } = require('../middleware/auth');
const { authorizePermission } = require('../middleware/rbac');
const { multiTenant } = require('../middleware/multiTenant');
const {
  addCustomerNoteValidator,
} = require('../validators/customer.validators');

router.use(authenticate);
router.use(multiTenant);

router.param('customerId', (req, res, next, val) => {
  if (!mongoose.Types.ObjectId.isValid(val)) {
    return res.status(400).json({ success: false, message: 'Invalid customer ID format', code: 'INVALID_ID' });
  }
  next();
});

router.get('/segments', authorizePermission('customers', 'read'), crmController.getCustomerSegments);
router.get('/:customerId/activity', authorizePermission('customers', 'read'), crmController.getCustomerActivity);
router.post('/:customerId/notes', authorizePermission('customers', 'update'), addCustomerNoteValidator, crmController.addCustomerNote);

module.exports = router;
