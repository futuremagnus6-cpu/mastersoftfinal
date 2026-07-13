const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notification.controller');
const { authenticate } = require('../middleware/auth');
const { multiTenant } = require('../middleware/multiTenant');
const {
  markNotifReadValidator,
  markAllNotifReadValidator,
} = require('../validators/remaining.validators');

router.use(authenticate);
router.use(multiTenant);

router.get('/', notificationController.getNotifications);
router.put('/:id/read', markNotifReadValidator, notificationController.markAsRead);
router.put('/read-all', markAllNotifReadValidator, notificationController.markAllAsRead);
router.delete('/:id', notificationController.deleteNotification);

module.exports = router;
