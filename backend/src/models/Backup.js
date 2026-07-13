const mongoose = require('mongoose');

const backupSchema = new mongoose.Schema({
  shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', default: null },
  type: { type: String, enum: ['daily', 'weekly', 'monthly', 'manual'], required: true },
  status: {
    type: String,
    enum: ['in_progress', 'completed', 'failed'],
    default: 'in_progress',
  },
  size: { type: Number, default: 0 }, // bytes
  path: { type: String },
  cloudPath: { type: String },
  isEncrypted: { type: Boolean, default: true },
  includes: [{
    type: String,
    enum: ['products', 'customers', 'orders', 'inventory', 'settings', 'employees', 'all'],
  }],
  checksum: { type: String },
  startedAt: { type: Date },
  completedAt: { type: Date },
  errorMessage: { type: String },
  retentionDays: { type: Number, default: 30 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, {
  timestamps: true,
});

backupSchema.index({ shopId: 1, createdAt: -1 });
backupSchema.index({ status: 1 });

module.exports = mongoose.model('Backup', backupSchema);
