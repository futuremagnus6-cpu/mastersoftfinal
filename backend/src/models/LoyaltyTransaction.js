const mongoose = require('mongoose');

const loyaltyTransactionSchema = new mongoose.Schema({
  shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  customerName: { type: String },
  customerMobile: { type: String },
  type: {
    type: String,
    enum: ['earned', 'redeemed', 'expired', 'bonus', 'birthday_bonus', 'referral_bonus', 'adjustment'],
    required: true,
  },
  points: { type: Number, required: true },
  balanceBefore: { type: Number, required: true },
  balanceAfter: { type: Number, required: true },
  // Snapshot of loyalty settings/rules at time of transaction
  loyaltySettings: {
    pointsPerRupee: { type: Number, default: 1 },
    redeemRate: { type: Number, default: 1 }, // points per rupee discount
    minRedeemPoints: { type: Number, default: 100 },
    maxRedeemPercent: { type: Number, default: 50 }, // max % of bill that can be paid with points
  },
  reference: { type: String },              // e.g. 'order', 'adjustment', 'referral'
  referenceId: { type: mongoose.Schema.Types.ObjectId },
  referenceNumber: { type: String },         // e.g. order number
  description: { type: String },
  expiresAt: { type: Date },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdByName: { type: String },
}, {
  timestamps: true,
});

loyaltyTransactionSchema.index({ shopId: 1, customer: 1, createdAt: -1 });
loyaltyTransactionSchema.index({ shopId: 1, type: 1 });
loyaltyTransactionSchema.index({ expiresAt: 1 }, { sparse: true });
loyaltyTransactionSchema.index({ referenceId: 1 }, { sparse: true });

module.exports = mongoose.model('LoyaltyTransaction', loyaltyTransactionSchema);
