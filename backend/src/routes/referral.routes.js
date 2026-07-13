const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const referralController = require('../controllers/referral.controller');
const { authenticate } = require('../middleware/auth');
const { authorize, authorizePermission } = require('../middleware/rbac');
const { multiTenant } = require('../middleware/multiTenant');
const {
  createReferralValidator,
  updateReferralValidator,
} = require('../validators/remaining.validators');

router.use(authenticate);
router.use(multiTenant);

router.param('id', (req, res, next, val) => {
  if (!mongoose.Types.ObjectId.isValid(val)) {
    return res.status(400).json({ success: false, message: 'Invalid ID format', code: 'INVALID_ID' });
  }
  next();
});

router.get('/stats', authorizePermission('referrals', 'read'), referralController.getReferralStats);

router.route('/')
  .get(authorizePermission('referrals', 'read'), referralController.getReferrals)
  .post(authorizePermission('referrals', 'create'), createReferralValidator, referralController.createReferral);

router.route('/:id')
  .get(authorizePermission('referrals', 'read'), referralController.getReferral)
  .put(authorizePermission('referrals', 'update'), updateReferralValidator, referralController.updateReferral)
  .delete(authorizePermission('referrals', 'delete'), referralController.deleteReferral);

module.exports = router;
