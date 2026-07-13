const mongoose = require('mongoose');

const membershipTierSchema = new mongoose.Schema({
  shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true },
  name: { type: String, required: [true, 'Tier name is required'], trim: true },
  level: { type: Number, required: true, min: 1 },
  minSpend: { type: Number, default: 0 },
  minPoints: { type: Number, default: 0 },
  benefits: {
    discountPercent: { type: Number, default: 0 },
    pointsMultiplier: { type: Number, default: 1 },
    freeDelivery: { type: Boolean, default: false },
    prioritySupport: { type: Boolean, default: false },
    birthdayBonus: { type: Number, default: 0 },
  },
  color: { type: String, default: '#808080' },
  icon: { type: String },
  isActive: { type: Boolean, default: true },
  sortOrder: { type: Number, default: 0 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, {
  timestamps: true,
});

membershipTierSchema.index({ shopId: 1, level: 1 }, { unique: true });

module.exports = mongoose.model('MembershipTier', membershipTierSchema);
