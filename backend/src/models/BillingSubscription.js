const mongoose = require('mongoose');

const billingSubscriptionSchema = new mongoose.Schema({
  shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true, index: true },
  plan: { type: mongoose.Schema.Types.ObjectId, ref: 'SubscriptionPlan', required: true },
  status: {
    type: String,
    enum: ['pending', 'active', 'past_due', 'expired', 'cancelled', 'suspended'],
    default: 'pending',
    index: true,
  },
  lifecycle: {
    type: String,
    enum: ['purchase', 'renewal', 'upgrade', 'downgrade', 'reactivation', 'admin_assignment'],
    default: 'purchase',
  },
  billingCycleMonths: { type: Number, enum: [1, 6, 12], required: true },
  currentPeriodStart: { type: Date },
  currentPeriodEnd: { type: Date, index: true },
  cancelledAt: { type: Date },
  cancelAtPeriodEnd: { type: Boolean, default: false },
  autoRenew: { type: Boolean, default: true },
  razorpaySubscriptionId: { type: String, sparse: true, index: true },
  lastTransaction: { type: mongoose.Schema.Types.ObjectId, ref: 'BillingTransaction' },
  metadata: { type: mongoose.Schema.Types.Mixed },
}, { timestamps: true });

billingSubscriptionSchema.index(
  { shopId: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: { $in: ['pending', 'active', 'past_due'] } } }
);

module.exports = mongoose.model('BillingSubscription', billingSubscriptionSchema);
