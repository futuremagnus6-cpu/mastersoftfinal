const mongoose = require('mongoose');

const referralSchema = new mongoose.Schema({
  shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true },
  referrer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  referredCustomer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', default: null },
  referralCode: { type: String, required: true },
  status: {
    type: String,
    enum: ['sent', 'clicked', 'signed_up', 'purchased', 'rewarded', 'expired'],
    default: 'sent',
  },
  rewardType: { type: String, enum: ['cashback', 'points', 'discount'], default: 'points' },
  rewardValue: { type: Number, default: 0 },
  referrerReward: { type: Number, default: 0 },
  referredReward: { type: Number, default: 0 },
  referrerRewarded: { type: Boolean, default: false },
  referredRewarded: { type: Boolean, default: false },
  source: { type: String, enum: ['whatsapp', 'link', 'sms', 'email'], default: 'link' },
  ip: { type: String },
  deviceFingerprint: { type: String },
  convertedAt: { type: Date },
  rewardedAt: { type: Date },
  expiresAt: { type: Date },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, {
  timestamps: true,
});

referralSchema.index({ shopId: 1, referralCode: 1 });
referralSchema.index({ shopId: 1, referrer: 1 });
referralSchema.index({ shopId: 1, status: 1 });

module.exports = mongoose.model('Referral', referralSchema);
