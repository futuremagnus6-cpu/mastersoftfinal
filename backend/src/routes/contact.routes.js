const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const contactController = require('../controllers/contact.controller');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const {
  submitEnquiryValidator,
  updateEnquiryValidator,
} = require('../validators/remaining.validators');

// Public - submit enquiry (no auth required)
router.post('/', submitEnquiryValidator, contactController.submitEnquiry);

// Admin only - view and manage enquiries
router.get('/stats', authenticate, authorize('super_admin'), contactController.getEnquiryStats);
router.param('id', (req, res, next, val) => {
  if (!mongoose.Types.ObjectId.isValid(val)) {
    return res.status(400).json({ success: false, message: 'Invalid ID format', code: 'INVALID_ID' });
  }
  next();
});

router.get('/', authenticate, authorize('super_admin'), contactController.getEnquiries);
router.get('/:id', authenticate, authorize('super_admin'), contactController.getEnquiry);
router.put('/:id', authenticate, authorize('super_admin'), updateEnquiryValidator, contactController.updateEnquiry);

module.exports = router;
