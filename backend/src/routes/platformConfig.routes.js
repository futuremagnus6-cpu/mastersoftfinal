const express = require('express');
const router = express.Router();
const platformConfigController = require('../controllers/platformConfig.controller');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const { updatePlatformConfigValidator } = require('../validators/remaining.validators');

router.use(authenticate);

// Public endpoint to check platform status (no auth required)
router.get('/status', platformConfigController.getPublicStatus);

router.get('/', authorize('super_admin'), platformConfigController.getConfig);
router.put('/', authorize('super_admin'), updatePlatformConfigValidator, platformConfigController.updateConfig);

module.exports = router;
