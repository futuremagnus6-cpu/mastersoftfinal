const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const supplierController = require('../controllers/supplier.controller');
const { authenticate } = require('../middleware/auth');
const { authorizePermission } = require('../middleware/rbac');
const { multiTenant } = require('../middleware/multiTenant');
const { requireFeature } = require('../middleware/featureCheck');
const {
  createSupplierValidator,
  updateSupplierValidator,
} = require('../validators/supplier.validators');

router.use(authenticate);
router.use(multiTenant);
router.use(requireFeature('suppliers'));

router.param('id', (req, res, next, val) => {
  if (!mongoose.Types.ObjectId.isValid(val)) {
    return res.status(400).json({ success: false, message: 'Invalid ID format', code: 'INVALID_ID' });
  }
  next();
});

router.route('/')
  .get(authorizePermission('suppliers', 'read'), supplierController.getSuppliers)
  .post(authorizePermission('suppliers', 'create'), createSupplierValidator, supplierController.createSupplier);

router.route('/:id')
  .get(authorizePermission('suppliers', 'read'), supplierController.getSupplier)
  .put(authorizePermission('suppliers', 'update'), updateSupplierValidator, supplierController.updateSupplier)
  .delete(authorizePermission('suppliers', 'delete'), supplierController.deleteSupplier);

module.exports = router;
