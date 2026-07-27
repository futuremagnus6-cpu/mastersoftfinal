const PlatformConfig = require('../models/PlatformConfig');
const Shop = require('../models/Shop');
const { AppError } = require('../middleware/errorHandler');
const { enableMaintenance, disableMaintenance } = require('../middleware/maintenance');

// @desc    Get global platform configuration
// @route   GET /api/platform-config
exports.getConfig = async (req, res, next) => {
  try {
    const config = await PlatformConfig.getConfig();
    res.json({ success: true, data: config });
  } catch (error) { next(error); }
};

// @desc    Get public status (maintenance mode only)
// @route   GET /api/platform-config/status
exports.getPublicStatus = async (req, res, next) => {
  try {
    const config = await PlatformConfig.getConfig();
    res.json({
      success: true,
      data: {
        maintenanceMode: config.maintenanceMode || false,
        platformName: config.platformName || 'Future Magnus Business OS',
      },
    });
  } catch (error) { next(error); }
};

// @desc    Update global platform configuration
// @route   PUT /api/platform-config
exports.updateConfig = async (req, res, next) => {
  try {
    const allowedFields = [
      'platformName', 'supportEmail', 'supportPhone',
      'logo',
      'defaultCurrency', 'timezone', 'dateFormat',
      'allowRegistration', 'defaultTrialDays', 'maxShopsPerAdmin',
      'sessionTimeout', 'passwordMinLength', 'twoFactorRequired',
      'rateLimitPerMinute',
      'authRateLimitIpMax', 'authRateLimitIpWindow',
      'authRateLimitAccountBaseMax', 'authRateLimitAccountBackoffFactor', 'authRateLimitAccountWindow',
      'publicRateLimitMax', 'publicRateLimitWindow',
      'apiRateLimitMax', 'apiRateLimitWindow',
      'webhookRetryCount',
      'maintenanceMode', 'backupEnabled', 'backupTime', 'retentionDays',
    ];

    // Track whether maintenance mode changed for the response message
    let wasMaintenanceEnabled = undefined;

    // If maintenanceMode is being changed, handle shop status updates
    if (req.body.maintenanceMode !== undefined) {
      const currentConfig = await PlatformConfig.getConfig();
      wasMaintenanceEnabled = currentConfig.maintenanceMode;
      const nowEnabled = req.body.maintenanceMode;

      if (wasMaintenanceEnabled !== nowEnabled) {
        if (nowEnabled) {
          // Maintenance mode ON → disable all active shops
          await Shop.updateMany(
            { status: 'active' },
            { $set: { status: 'disabled', disabledByMaintenance: true } }
          );
          // Create file-based maintenance flag
          enableMaintenance('The site is currently under maintenance. Please check back later.');
        } else {
          // Maintenance mode OFF → restore all shops disabled by maintenance
          await Shop.updateMany(
            { disabledByMaintenance: true },
            { $set: { status: 'active', disabledByMaintenance: false } }
          );
          // Remove file-based maintenance flag
          disableMaintenance();
        }
      }
    }

    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    updates.updatedBy = req.userId;

    const config = await PlatformConfig.findOneAndUpdate(
      { key: 'global' },
      { $set: updates },
      { new: true, upsert: true, runValidators: true }
    );

    // Determine the message based on maintenance mode change
    let message = 'Platform settings updated';
    if (req.body.maintenanceMode === true && wasMaintenanceEnabled === false) {
      message = 'Maintenance mode enabled. All shops have been disabled.';
    } else if (req.body.maintenanceMode === false && wasMaintenanceEnabled === true) {
      message = 'Maintenance mode disabled. All shops have been re-enabled.';
    }

    res.json({ success: true, message, data: config });
  } catch (error) { next(error); }
};
