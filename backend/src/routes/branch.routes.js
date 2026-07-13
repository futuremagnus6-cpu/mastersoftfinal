const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const branchController = require('../controllers/branch.controller');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const { multiTenant } = require('../middleware/multiTenant');
const {
  createBranchValidator,
  updateBranchValidator,
} = require('../validators/branch.validators');

router.use(authenticate);
router.use(multiTenant);
router.use(authorize('shop_admin', 'manager'));

router.param('id', (req, res, next, val) => {
  if (!mongoose.Types.ObjectId.isValid(val)) {
    return res.status(400).json({ success: false, message: 'Invalid ID format', code: 'INVALID_ID' });
  }
  next();
});

router.route('/')
  .get(branchController.getBranches)
  .post(authorize('shop_admin'), createBranchValidator, branchController.createBranch);

router.route('/:id')
  .get(branchController.getBranch)
  .put(authorize('shop_admin'), updateBranchValidator, branchController.updateBranch)
  .delete(authorize('shop_admin'), branchController.deleteBranch);

module.exports = router;
