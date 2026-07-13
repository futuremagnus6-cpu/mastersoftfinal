const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const subscriptionController = require('../controllers/subscription.controller');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const { multiTenant } = require('../middleware/multiTenant');
const {
  createPlanValidator,
  updatePlanValidator,
} = require('../validators/subscription.validators');

router.use(authenticate);

router.param('id', (req, res, next, val) => {
  if (!mongoose.Types.ObjectId.isValid(val)) {
    return res.status(400).json({ success: false, message: 'Invalid ID format', code: 'INVALID_ID' });
  }
  next();
});

// Public plan listing
router.get('/plans', subscriptionController.getPlans);
router.get('/my-subscription', multiTenant, subscriptionController.getShopSubscription);

// Super admin routes
router.post('/plans', authorize('super_admin'), createPlanValidator, subscriptionController.createPlan);
router.get('/plans/:id', subscriptionController.getPlan);
router.put('/plans/:id', authorize('super_admin'), updatePlanValidator, subscriptionController.updatePlan);
router.delete('/plans/:id', authorize('super_admin'), subscriptionController.deletePlan);
router.post('/assign', authorize('super_admin'), subscriptionController.assignPlan);

module.exports = router;
