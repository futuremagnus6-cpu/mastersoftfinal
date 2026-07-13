const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const backupController = require('../controllers/backup.controller');
const { authenticate } = require('../middleware/auth');
const { authorize, authorizePermission } = require('../middleware/rbac');
const { multiTenant } = require('../middleware/multiTenant');
const {
  createBackupValidator,
} = require('../validators/remaining.validators');

router.use(authenticate);
router.use(multiTenant);

router.param('id', (req, res, next, val) => {
  if (!mongoose.Types.ObjectId.isValid(val)) {
    return res.status(400).json({ success: false, message: 'Invalid ID format', code: 'INVALID_ID' });
  }
  next();
});

router.route('/')
  .get(authorizePermission('backups', 'read'), backupController.getBackups)
  .post(authorizePermission('backups', 'create'), createBackupValidator, backupController.createBackup);

router.route('/:id')
  .get(authorizePermission('backups', 'read'), backupController.getBackup)
  .delete(authorizePermission('backups', 'delete'), backupController.deleteBackup);

router.post('/:id/restore', authorize('shop_admin'), backupController.restoreBackup);

module.exports = router;
