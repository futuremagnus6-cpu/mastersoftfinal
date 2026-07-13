const mongoose = require('mongoose');
const crypto = require('crypto');

const apiKeySchema = new mongoose.Schema({
  shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true },
  name: { type: String, required: [true, 'Key name is required'], trim: true },
  key: { type: String, required: true, unique: true },
  prefix: { type: String, required: true },
  permissions: {
    read: { type: Boolean, default: true },
    write: { type: Boolean, default: false },
    admin: { type: Boolean, default: false },
  },
  scopes: [{ type: String }], // e.g. ['products:read', 'orders:write']
  allowedIps: [{ type: String }],
  lastUsedAt: { type: Date },
  expiresAt: { type: Date },
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, {
  timestamps: true,
});

apiKeySchema.index({ shopId: 1, isActive: 1 });
apiKeySchema.index({ prefix: 1 });

apiKeySchema.pre('save', function (next) {
  if (this.isNew) {
    const prefix = 'mag_';
    const randomBytes = crypto.randomBytes(32).toString('hex');
    this.key = `${prefix}${randomBytes}`;
    this.prefix = prefix;
  }
  next();
});

apiKeySchema.methods.maskKey = function () {
  return `${this.prefix}${'*'.repeat(8)}${this.key.slice(-4)}`;
};

module.exports = mongoose.model('ApiKey', apiKeySchema);
