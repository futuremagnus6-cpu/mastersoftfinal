const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
  shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true },
  branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', default: null },
  customerId: { type: String, required: true, trim: true },
  name: { type: String, required: [true, 'Customer name is required'], trim: true },
  mobile: { type: String, required: [true, 'Mobile number is required'], trim: true },
  email: { type: String, lowercase: true, trim: true },
  gstin: { type: String, trim: true },
  pan: { type: String, trim: true },
  address: {
    line1: { type: String },
    line2: { type: String },
    city: { type: String },
    state: { type: String },
    pincode: { type: String },
  },
  dob: { type: Date },
  anniversary: { type: Date },
  gender: { type: String, enum: ['male', 'female', 'other', 'prefer_not_to_say'] },
  notes: { type: String },
  tags: [{ type: String }],
  creditLimit: { type: Number, default: 0, min: 0 },
  creditBalance: { type: Number, default: 0, min: 0 },
  advanceBalance: { type: Number, default: 0, min: 0 },
  totalPurchases: { type: Number, default: 0 },
  totalSpent: { type: Number, default: 0 },
  lastPurchaseDate: { type: Date },
  totalOrders: { type: Number, default: 0 },
  membership: {
    tier: { type: mongoose.Schema.Types.ObjectId, ref: 'MembershipTier', default: null },
    enrolledAt: { type: Date },
    expiryDate: { type: Date },
    isActive: { type: Boolean, default: false },
    autoRenew: { type: Boolean, default: false },
  },
  loyalty: {
    points: { type: Number, default: 0, min: 0 },
    lifetimePoints: { type: Number, default: 0 },
    tier: { type: String, enum: ['silver', 'gold', 'platinum'], default: 'silver' },
    referralCode: { type: String, unique: true, sparse: true },
    referredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', default: null },
  },
  communication: {
    emailOptIn: { type: Boolean, default: true },
    whatsappOptIn: { type: Boolean, default: true },
    smsOptIn: { type: Boolean, default: false },
  },
  isActive: { type: Boolean, default: true },
  taxExempted: { type: Boolean, default: false },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

customerSchema.index({ shopId: 1, customerId: 1 }, { unique: true });
customerSchema.index({ shopId: 1, mobile: 1 });
customerSchema.index({ shopId: 1, 'loyalty.referralCode': 1 }, { sparse: true });
customerSchema.index({ shopId: 1, 'membership.tier': 1 });
customerSchema.index({ name: 'text', mobile: 'text', customerId: 'text' });

customerSchema.virtual('orders', {
  ref: 'Order',
  localField: '_id',
  foreignField: 'customer',
});

customerSchema.virtual('loyaltyTransactions', {
  ref: 'LoyaltyTransaction',
  localField: '_id',
  foreignField: 'customer',
});

module.exports = mongoose.model('Customer', customerSchema);
