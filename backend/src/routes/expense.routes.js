const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const expenseController = require('../controllers/expense.controller');
const { authenticate } = require('../middleware/auth');
const { authorize, authorizePermission } = require('../middleware/rbac');
const { multiTenant } = require('../middleware/multiTenant');
const { requireFeature } = require('../middleware/featureCheck');
const {
  createExpenseValidator,
  updateExpenseValidator,
  approveExpenseValidator,
} = require('../validators/supplier.validators');

router.use(authenticate);
router.use(multiTenant);
router.use(requireFeature('expenses'));

router.param('id', (req, res, next, val) => {
  if (!mongoose.Types.ObjectId.isValid(val)) {
    return res.status(400).json({ success: false, message: 'Invalid ID format', code: 'INVALID_ID' });
  }
  next();
});

router.route('/')
  .get(authorizePermission('expenses', 'read'), expenseController.getExpenses)
  .post(authorizePermission('expenses', 'create'), createExpenseValidator, expenseController.createExpense);

router.route('/:id')
  .get(authorizePermission('expenses', 'read'), expenseController.getExpense)
  .put(authorizePermission('expenses', 'update'), updateExpenseValidator, expenseController.updateExpense)
  .delete(authorizePermission('expenses', 'delete'), expenseController.deleteExpense);

router.put('/:id/approve', authorize('shop_admin', 'manager'), approveExpenseValidator, expenseController.approveExpense);

module.exports = router;
