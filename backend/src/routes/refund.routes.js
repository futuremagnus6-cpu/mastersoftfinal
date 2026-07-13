const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const refundController = require('../controllers/refund.controller');
const { authenticate } = require('../middleware/auth');
const { authorize, authorizePermission } = require('../middleware/rbac');
const { multiTenant } = require('../middleware/multiTenant');
const {
  createReturnValidator,
  updateReturnValidator,
  processReturnValidator,
} = require('../validators/order.validators');

router.use(authenticate);
router.use(multiTenant);

router.param('id', (req, res, next, val) => {
  if (!mongoose.Types.ObjectId.isValid(val)) {
    return res.status(400).json({ success: false, message: 'Invalid ID format', code: 'INVALID_ID' });
  }
  next();
});

router.route('/')
  .get(authorizePermission('returns', 'read'), refundController.getReturns)
  .post(authorizePermission('returns', 'create'), createReturnValidator, refundController.createReturn);

router.route('/:id')
  .get(authorizePermission('returns', 'read'), refundController.getReturn)
  .put(authorizePermission('returns', 'update'), updateReturnValidator, refundController.updateReturn)
  .delete(authorizePermission('returns', 'delete'), refundController.deleteReturn);

router.put('/:id/approve', authorize('shop_admin', 'manager'), processReturnValidator, refundController.approveReturn);
router.put('/:id/process', authorize('shop_admin', 'manager'), processReturnValidator, refundController.processReturn);
router.put('/:id/reject', authorize('shop_admin', 'manager'), processReturnValidator, refundController.rejectReturn);

module.exports = router;
