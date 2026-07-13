const mongoose = require('mongoose');

const billingTransactionSchema = new mongoose.Schema({
  shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true, index: true },
  subscription: { type: mongoose.Schema.Types.ObjectId, ref: 'BillingSubscription', index: true },
  plan: { type: mongoose.Schema.Types.ObjectId, ref: 'SubscriptionPlan', required: true },
  type: {
    type: String,
    enum: ['purchase', 'renewal', 'upgrade', 'downgrade', 'reactivation', 'refund', 'adjustment'],
    default: 'purchase',
    index: true,
  },
  status: {
    type: String,
    enum: ['created', 'pending', 'authorized', 'captured', 'failed', 'refunded', 'cancelled'],
    default: 'created',
    index: true,
  },
  amount: { type: Number, required: true, min: 0 },
  amountPaid: { type: Number, default: 0, min: 0 },
  amountRefunded: { type: Number, default: 0, min: 0 },
  currency: { type: String, default: 'INR' },
  billingCycleMonths: { type: Number, enum: [1, 6, 12], required: true },
  periodStart: { type: Date },
  periodEnd: { type: Date },
  invoiceNumber: { type: String, required: true, unique: true },
  invoiceUrl: { type: String },
  razorpayOrderId: { type: String, unique: true, sparse: true },
  razorpayPaymentId: { type: String, unique: true, sparse: true },
  razorpaySignature: { type: String },
  razorpayInvoiceId: { type: String, sparse: true, index: true },
  idempotencyKey: { type: String, required: true, unique: true },
  failureReason: { type: String },
  paidAt: { type: Date },
  refundedAt: { type: Date },
  metadata: { type: mongoose.Schema.Types.Mixed },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

billingTransactionSchema.index({ shopId: 1, createdAt: -1 });
billingTransactionSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('BillingTransaction', billingTransactionSchema);
