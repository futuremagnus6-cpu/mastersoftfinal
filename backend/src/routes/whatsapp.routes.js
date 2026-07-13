const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { authorize, authorizePermission } = require('../middleware/rbac');
const { multiTenant } = require('../middleware/multiTenant');
const {
  sendWhatsAppValidator,
  verifyWhatsAppValidator,
} = require('../validators/remaining.validators');

router.use(authenticate);
router.use(multiTenant);

// WhatsApp messaging endpoints (placeholder)
router.post('/send', authorizePermission('whatsapp', 'create'), sendWhatsAppValidator, (req, res) => {
  res.json({ success: true, message: 'WhatsApp message queued for delivery' });
});

router.get('/templates', authorizePermission('whatsapp', 'read'), (req, res) => {
  res.json({ success: true, data: [] });
});

router.post('/verify', authorize('shop_admin'), verifyWhatsAppValidator, (req, res) => {
  res.json({ success: true, message: 'WhatsApp number verification initiated' });
});

module.exports = router;
