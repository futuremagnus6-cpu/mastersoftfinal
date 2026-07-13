const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', default: null },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  action: {
    type: String,
    enum: ['create', 'update', 'delete', 'read', 'login', 'logout', 'export', 'import', 'transfer', 'payment', 'send_password_reset', 'close_trial', 'extend_trial', 'send_subscription_reminder'],
    required: true,
  },
  resource: { type: String, required: true },
  resourceId: { type: mongoose.Schema.Types.ObjectId },
  description: { type: String, required: true },
  changes: { type: mongoose.Schema.Types.Mixed },
  ip: { type: String },
  userAgent: { type: String },
  deviceFingerprint: { type: String },
  location: { type: String },
  status: { type: String, enum: ['success', 'failure'], default: 'success' },
  metadata: { type: mongoose.Schema.Types.Mixed },
}, {
  timestamps: true,
});

auditLogSchema.index({ shopId: 1, createdAt: -1 });
auditLogSchema.index({ user: 1, createdAt: -1 });
auditLogSchema.index({ resource: 1, resourceId: 1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ ip: 1 });

// TTL index: keep logs for 1 year
auditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
