const mongoose = require('mongoose');

const billingEventSchema = new mongoose.Schema({
  provider: { type: String, enum: ['razorpay', 'system', 'admin'], default: 'razorpay' },
  eventId: { type: String, required: true, unique: true },
  eventType: { type: String, required: true, index: true },
  status: { type: String, enum: ['received', 'processed', 'ignored', 'failed'], default: 'received', index: true },
  shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', index: true },
  transaction: { type: mongoose.Schema.Types.ObjectId, ref: 'BillingTransaction' },
  signature: { type: String },
  payload: { type: mongoose.Schema.Types.Mixed },
  error: { type: String },
  processedAt: { type: Date },
}, { timestamps: true });

billingEventSchema.index({ createdAt: -1 });

module.exports = mongoose.model('BillingEvent', billingEventSchema);
