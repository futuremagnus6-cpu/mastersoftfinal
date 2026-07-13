const mongoose = require('mongoose');

const webhookSchema = new mongoose.Schema({
  shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true },
  name: { type: String, required: true, trim: true },
  url: { type: String, required: [true, 'Webhook URL is required'] },
  events: [{
    type: String,
    enum: [
      'order.created', 'order.updated', 'order.cancelled',
      'payment.received', 'payment.failed',
      'inventory.low_stock', 'inventory.out_of_stock',
      'customer.created', 'customer.updated',
      'invoice.generated',
      'return.requested', 'return.completed',
      'product.created', 'product.updated',
    ],
  }],
  secret: { type: String, required: true },
  isActive: { type: Boolean, default: true },
  retryCount: { type: Number, default: 3 },
  timeout: { type: Number, default: 5000 }, // ms
  headers: { type: mongoose.Schema.Types.Mixed },
  lastTriggeredAt: { type: Date },
  lastResponse: { type: Number }, // status code
  lastError: { type: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, {
  timestamps: true,
});

webhookSchema.index({ shopId: 1, isActive: 1 });

webhookSchema.pre('save', function (next) {
  if (this.isNew) {
    const crypto = require('crypto');
    this.secret = crypto.randomBytes(32).toString('hex');
  }
  next();
});

module.exports = mongoose.model('Webhook', webhookSchema);
