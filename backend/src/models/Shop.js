const mongoose = require('mongoose');

const shopSchema = new mongoose.Schema({
  name: { type: String, required: [true, 'Shop name is required'], trim: true },
  businessType: {
    type: String,
    enum: [
      'medical_store', 'pharmacy', 'distributor', 'grocery_store',
      'supermarket', 'electronics_shop', 'mobile_shop', 'cosmetics_shop',
      'hardware_shop', 'riyansh_mlm', 'custom'
    ],
    required: [true, 'Business type is required'],
  },
  customBusinessType: { type: String, trim: true },
  gstin: { type: String, trim: true },
  pan: { type: String, trim: true },
  address: {
    line1: { type: String, required: true },
    line2: { type: String },
    city: { type: String, required: true },
    state: { type: String, required: true },
    pincode: { type: String, required: true },
    country: { type: String, default: 'India' },
  },
  contact: {
    phone: { type: String, required: true },
    email: { type: String, required: true },
    website: { type: String },
  },
  logo: { type: String },
  branding: {
    primaryColor: { type: String, default: '#2563eb' },
    secondaryColor: { type: String, default: '#1d4ed8' },
    accentColor: { type: String, default: '#f59e0b' },
    fontFamily: { type: String, default: 'Inter' },
  },
  settings: {
    currency: { type: String, default: 'INR' },
    timezone: { type: String, default: 'Asia/Kolkata' },
    dateFormat: { type: String, default: 'DD/MM/YYYY' },
    language: { type: String, enum: ['en', 'hi', 'mr', 'gu', 'ta', 'te', 'kn', 'bn'], default: 'en' },
    taxInclusive: { type: Boolean, default: true },
    compositionScheme: { type: Boolean, default: false },
    offlinePos: { type: Boolean, default: false },
    darkMode: { type: Boolean, default: false },
    multiLanguage: { type: Boolean, default: false },
    autoBackup: { type: Boolean, default: false },
    backupTime: { type: String, default: '02:00' },
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
  },
  limits: {
    maxUsers: { type: Number, default: 5 },
    maxProducts: { type: Number, default: 1000 },
    maxBranches: { type: Number, default: 1 },
    maxStorage: { type: Number, default: 5 }, // GB
  },
  subscription: {
    plan: { type: mongoose.Schema.Types.ObjectId, ref: 'SubscriptionPlan' },
    status: {
      type: String,
      enum: ['active', 'trial', 'expired', 'suspended', 'cancelled'],
      default: 'trial',
    },
    trialEndsAt: { type: Date },
    currentPeriodStart: { type: Date },
    currentPeriodEnd: { type: Date },
    razorpaySubscriptionId: { type: String },
    autoRenew: { type: Boolean, default: true },
    durationMonths: { type: Number, default: 1 }, // 1, 6, or 12
    gracePeriodEndsAt: { type: Date },
    suspendedAt: { type: Date },
  },
  usage: {
    currentUsers: { type: Number, default: 0 },
    currentProducts: { type: Number, default: 0 },
    currentBranches: { type: Number, default: 1 },
    currentStorage: { type: Number, default: 0 }, // MB
    totalOrders: { type: Number, default: 0 },
    totalRevenue: { type: Number, default: 0 },
    totalCustomers: { type: Number, default: 0 },
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended', 'disabled'],
    default: 'active',
  },
  activatedAt: { type: Date },
  suspendedAt: { type: Date },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

shopSchema.index({ status: 1 });
shopSchema.index({ 'contact.email': 1 });
shopSchema.index({ 'subscription.status': 1 });
shopSchema.index({ gstin: 1 });

shopSchema.virtual('branches', {
  ref: 'Branch',
  localField: '_id',
  foreignField: 'shopId',
});

shopSchema.virtual('users', {
  ref: 'User',
  localField: '_id',
  foreignField: 'shopId',
});

module.exports = mongoose.model('Shop', shopSchema);
