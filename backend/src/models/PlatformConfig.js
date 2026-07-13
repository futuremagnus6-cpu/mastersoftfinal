const mongoose = require('mongoose');

const platformConfigSchema = new mongoose.Schema({
  // Singleton key — always 'global'
  key: { type: String, default: 'global', unique: true },

  // General
  platformName: { type: String, default: 'Future Magnus Business OS' },
  supportEmail: { type: String, default: 'support@futuremagnus.com' },
  supportPhone: { type: String, default: '+91-9999999999' },

  // Regional
  defaultCurrency: { type: String, default: 'INR' },
  timezone: { type: String, default: 'Asia/Kolkata' },
  dateFormat: { type: String, default: 'DD/MM/YYYY' },

  // Registration & Trial
  allowRegistration: { type: Boolean, default: true },
  defaultTrialDays: { type: Number, default: 14 },
  maxShopsPerAdmin: { type: Number, default: 100 },

  // Security
  sessionTimeout: { type: Number, default: 60 },  // minutes
  passwordMinLength: { type: Number, default: 8 },
  twoFactorRequired: { type: Boolean, default: false },

  // API
  rateLimitPerMinute: { type: Number, default: 60 },

  // ─── Rate Limiting (Auth — IP) ───
  authRateLimitIpMax: { type: Number, default: 10 },
  authRateLimitIpWindow: { type: Number, default: 15 }, // minutes

  // ─── Rate Limiting (Auth — Account / Exponential Backoff) ───
  authRateLimitAccountBaseMax: { type: Number, default: 5 },
  authRateLimitAccountBackoffFactor: { type: Number, default: 2 },
  authRateLimitAccountWindow: { type: Number, default: 15 }, // minutes

  // ─── Rate Limiting (Public Endpoints) ───
  publicRateLimitMax: { type: Number, default: 30 },
  publicRateLimitWindow: { type: Number, default: 15 }, // minutes

  // ─── Rate Limiting (Authenticated API) ───
  apiRateLimitMax: { type: Number, default: 100 },
  apiRateLimitWindow: { type: Number, default: 15 }, // minutes

  webhookRetryCount: { type: Number, default: 3 },

  // Maintenance
  maintenanceMode: { type: Boolean, default: false },
  backupEnabled: { type: Boolean, default: true },
  backupTime: { type: String, default: '02:00' },
  retentionDays: { type: Number, default: 30 },

  // Tracking
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, {
  timestamps: true,
});

// Ensure only one global config document exists
platformConfigSchema.statics.getConfig = async function () {
  let config = await this.findOne({ key: 'global' });
  if (!config) {
    config = await this.create({ key: 'global' });
  }
  return config;
};

module.exports = mongoose.model('PlatformConfig', platformConfigSchema);
