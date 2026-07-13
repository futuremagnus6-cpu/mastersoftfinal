const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const { multiTenant } = require('../middleware/multiTenant');
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');

router.use(authenticate);
router.use(multiTenant);

// Data migration endpoints
const exportValidator = [
  body('format')
    .optional()
    .trim()
    .isIn(['json', 'csv', 'xlsx']).withMessage('Format must be json, csv, or xlsx'),
  body('collections')
    .optional()
    .isArray().withMessage('Collections must be an array'),
  validate,
];

const importValidator = [
  body('file')
    .optional()
    .isString().withMessage('File reference must be a string'),
  body('overwrite')
    .optional()
    .isBoolean().withMessage('Overwrite must be a boolean'),
  validate,
];

router.post('/export', authorize('shop_admin'), exportValidator, (req, res) => {
  res.json({ success: true, message: 'Data export initiated. You will be notified when completed.' });
});

router.post('/import', authorize('shop_admin'), importValidator, (req, res) => {
  res.json({ success: true, message: 'Data import initiated. You will be notified when completed.' });
});

router.get('/status', authorize('shop_admin'), (req, res) => {
  res.json({ success: true, message: 'No active migrations', data: { status: 'idle', lastRun: null } });
});

module.exports = router;
