const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const supportController = require('../controllers/support.controller');
const { authenticate } = require('../middleware/auth');
const { authorize, authorizePermission } = require('../middleware/rbac');
const { multiTenant } = require('../middleware/multiTenant');
const { requireFeature } = require('../middleware/featureCheck');
const {
  createTicketValidator,
  updateTicketValidator,
  addMessageValidator,
} = require('../validators/support.validators');

router.use(authenticate);
router.use(multiTenant);
router.use(requireFeature('customerSupport'));

router.param('id', (req, res, next, val) => {
  if (!mongoose.Types.ObjectId.isValid(val)) {
    return res.status(400).json({ success: false, message: 'Invalid ID format', code: 'INVALID_ID' });
  }
  next();
});

router.get('/stats', authorize('shop_admin', 'manager'), supportController.getStats);
router.route('/')
  .get(authorizePermission('support', 'read'), supportController.getTickets)
  .post(authorizePermission('support', 'create'), createTicketValidator, supportController.createTicket);
router.route('/:id')
  .get(authorizePermission('support', 'read'), supportController.getTicket)
  .put(authorizePermission('support', 'update'), updateTicketValidator, supportController.updateTicket);
router.post('/:id/messages', authorizePermission('support', 'update'), addMessageValidator, supportController.addMessage);

module.exports = router;
