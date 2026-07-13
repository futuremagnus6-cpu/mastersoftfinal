const mongoose = require('mongoose');

const subscriptionPlanSchema = new mongoose.Schema({
  name: { type: String, required: [true, 'Plan name is required'], trim: true },
  description: { type: String },
  monthlyPrice: { type: Number, required: true, min: 0 },
  quarterlyPrice: { type: Number, min: 0 }, // price for 3 months
  semiAnnualPrice: { type: Number, min: 0 }, // price for 6 months (if not set, calculated with 5% discount)
  annualPrice: { type: Number, min: 0 }, // price for 12 months (if not set, calculated with 10% discount)
  trialPeriod: { type: Number, default: 14 }, // days
  limits: {
    maxUsers: { type: Number, default: 5 },
    maxProducts: { type: Number, default: 1000 },
    maxBranches: { type: Number, default: 1 },
    maxStorage: { type: Number, default: 5 }, // GB
  },
  features: {
    pos: { type: Boolean, default: true },
    inventory: { type: Boolean, default: true },
    crm: { type: Boolean, default: false },
    suppliers: { type: Boolean, default: false },
    purchases: { type: Boolean, default: false },
    expenses: { type: Boolean, default: false },
    employees: { type: Boolean, default: false },
    multiBranch: { type: Boolean, default: false },
    loyalty: { type: Boolean, default: false },
    ecommerce: { type: Boolean, default: false },
    customerPortal: { type: Boolean, default: false },
    barcodeScanner: { type: Boolean, default: false },
    thermalPrinter: { type: Boolean, default: false },
    whatsappNotifications: { type: Boolean, default: false },
    emailNotifications: { type: Boolean, default: true },
    lowStockAlerts: { type: Boolean, default: true },
    expiryAlerts: { type: Boolean, default: true },
    gstModule: { type: Boolean, default: true },
    apiAccess: { type: Boolean, default: false },
    referralSystem: { type: Boolean, default: false },
    affiliateSystem: { type: Boolean, default: false },
    aiForecasting: { type: Boolean, default: false },
    customerSupport: { type: Boolean, default: false },
    darkMode: { type: Boolean, default: true },
    multiLanguage: { type: Boolean, default: false },
    autoBackup: { type: Boolean, default: false },
    offlinePos: { type: Boolean, default: false },
  },
  supportLevel: { type: String, enum: ['email', 'chat', 'dedicated'], default: 'email' },
  apiAccess: { type: Boolean, default: false },
  whiteLabel: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  sortOrder: { type: Number, default: 0 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, {
  timestamps: true,
});

subscriptionPlanSchema.index({ isActive: 1, sortOrder: 1 });

module.exports = mongoose.model('SubscriptionPlan', subscriptionPlanSchema);
