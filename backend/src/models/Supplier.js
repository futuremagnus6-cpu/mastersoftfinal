const mongoose = require('mongoose');

const supplierSchema = new mongoose.Schema({
  shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true },
  name: { type: String, required: [true, 'Supplier name is required'], trim: true },
  company: { type: String, trim: true },
  mobile: { type: String, required: [true, 'Mobile is required'], trim: true },
  email: { type: String, lowercase: true, trim: true },
  gstin: { type: String, trim: true },
  pan: { type: String, trim: true },
  bankDetails: {
    accountName: { type: String },
    accountNumber: { type: String },
    ifsc: { type: String },
    bankName: { type: String },
    branch: { type: String },
    upiId: { type: String },
  },
  address: {
    line1: { type: String },
    line2: { type: String },
    city: { type: String },
    state: { type: String },
    pincode: { type: String },
  },
  creditLimit: { type: Number, default: 0 },
  creditBalance: { type: Number, default: 0 },
  paymentTerms: { type: String, default: 'immediate' },
  leadTime: { type: Number, default: 0 }, // days
  products: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
  priceHistory: [{
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    price: { type: Number },
    date: { type: Date, default: Date.now },
  }],
  totalPurchases: { type: Number, default: 0 },
  totalAmount: { type: Number, default: 0 },
  lastPurchaseDate: { type: Date },
  isActive: { type: Boolean, default: true },
  notes: { type: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, {
  timestamps: true,
});

supplierSchema.index({ shopId: 1, name: 1 });
supplierSchema.index({ shopId: 1, mobile: 1 });
supplierSchema.index({ shopId: 1, gstin: 1 }, { sparse: true });

module.exports = mongoose.model('Supplier', supplierSchema);
