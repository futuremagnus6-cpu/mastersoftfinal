const PlatformConfig = require('../models/PlatformConfig');
const { AppError } = require('../middleware/errorHandler');

// @desc    Get global platform configuration
// @route   GET /api/platform-config
exports.getConfig = async (req, res, next) => {
  try {
    const config = await PlatformConfig.getConfig();
    res.json({ success: true, data: config });
  } catch (error) { next(error); }
};

// @desc    Update global platform configuration
// @route   PUT /api/platform-config
exports.updateConfig = async (req, res, next) => {
  try {
    const allowedFields = [
      'platformName', 'supportEmail', 'supportPhone',
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

    res.json({ success: true, message: 'Platform settings updated', data: config });
  } catch (error) { next(error); }
};
