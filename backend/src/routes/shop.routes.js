const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const shopController = require('../controllers/shop.controller');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const {
  registerShopValidator,
  createShopValidator,
  updateShopValidator,
  extendTrialValidator,
  sendAnnouncementValidator,
} = require('../validators/shop.validators');

// Public route: self-registration (no auth required)
router.post('/register', registerShopValidator, shopController.registerShop);

// All other shop routes require authentication
router.use(authenticate);

// Validate all :id params are valid MongoDB ObjectIds
router.param('id', (req, res, next, val) => {
  if (!mongoose.Types.ObjectId.isValid(val)) {
    return res.status(400).json({ success: false, message: 'Invalid ID format', code: 'INVALID_ID' });
  }
  next();
});

// List all shops — super_admin only
router.get('/', authorize('super_admin'), shopController.getShops);

// Create shop — super_admin only
router.post('/', authorize('super_admin'), createShopValidator, shopController.createShop);

// Global shop stats — super_admin only
router.get('/stats', authorize('super_admin'), shopController.getShopStats);

// Single shop: super_admin can access any shop, shop_admin can access only their own
// (access guard is enforced inside the controller)
router.get('/:id', authorize('super_admin', 'shop_admin'), shopController.getShop);
router.put('/:id', authorize('super_admin', 'shop_admin'), updateShopValidator, shopController.updateShop);
router.delete('/:id', authorize('super_admin'), shopController.deleteShop);

router.put('/:id/activate', authorize('super_admin'), shopController.activateShop);
router.put('/:id/suspend', authorize('super_admin'), shopController.suspendShop);
router.get('/:id/stats', authorize('super_admin'), shopController.getShopStats);

// Shop admin password reset endpoints
router.post('/:id/send-reset-link', authorize('super_admin'), shopController.sendAdminPasswordResetLink);
router.get('/:id/admin', authorize('super_admin'), shopController.getShopAdmin);

// Trial management routes (Super Admin only)
router.put('/:id/close-trial', authorize('super_admin'), shopController.closeTrial);
router.put('/:id/extend-trial', authorize('super_admin'), extendTrialValidator, shopController.extendTrial);
router.post('/:id/send-subscription-reminder', authorize('super_admin'), shopController.sendSubscriptionReminder);

// Announcement / Mass Email (Super Admin only)
router.post('/send-announcement', authorize('super_admin'), sendAnnouncementValidator, shopController.sendAnnouncement);

// Recycle Bin (Super Admin only)
router.get('/recycle-bin/list', authorize('super_admin'), shopController.getRecycleBin);
router.put('/:id/restore', authorize('super_admin'), shopController.restoreShop);
router.delete('/:id/permanent-delete', authorize('super_admin'), shopController.permanentDeleteShop);

module.exports = router;
