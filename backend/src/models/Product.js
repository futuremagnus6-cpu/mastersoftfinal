const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true },
  branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', default: null },
  name: { type: String, required: [true, 'Product name is required'], trim: true },
  nameLocal: {
    hi: { type: String },
    mr: { type: String },
    gu: { type: String },
    ta: { type: String },
    te: { type: String },
    kn: { type: String },
    bn: { type: String },
  },
  sku: { type: String, required: true, trim: true },
  barcode: { type: String, trim: true },
  description: { type: String },
  category: { type: String, required: true, trim: true },
  subcategory: { type: String },
  brand: { type: String },
  unit: { type: String, default: 'pcs', enum: ['pcs', 'kg', 'g', 'l', 'ml', 'm', 'box', 'pack', 'dozen', 'carton'] },
  pricing: {
    mrp: { type: Number, required: true, min: 0 },
    sellingPrice: { type: Number, required: true, min: 0 },
    purchasePrice: { type: Number, default: 0, min: 0 },
    wholesalePrice: { type: Number, min: 0 },
    gstRate: { type: Number, enum: [0, 5, 12, 18, 28], default: 18 },
    gstInclusive: { type: Boolean, default: true },
    discountPercent: { type: Number, default: 0, min: 0, max: 100 },
    cess: { type: Number, default: 0, min: 0 },
  },
  tax: {
    hsnCode: { type: String },
    sacCode: { type: String },
    taxExempted: { type: Boolean, default: false },
    compositionScheme: { type: Boolean, default: false },
  },
  inventory: {
    quantity: { type: Number, default: 0, min: 0 },
    minStockLevel: { type: Number, default: 10, min: 0 },
    maxStockLevel: { type: Number, default: 1000 },
    reorderPoint: { type: Number, default: 20 },
    location: { type: String },
    rackNumber: { type: String },
  },
  images: [{
    url: { type: String, required: true },
    type: { type: String, enum: ['upload', 'link'], default: 'upload' },
    isMain: { type: Boolean, default: false },
    uploadedAt: { type: Date, default: Date.now },
  }],
  batchTracking: { type: Boolean, default: false },
  batches: [{
    batchNumber: { type: String },
    quantity: { type: Number, default: 0 },
    mfgDate: { type: Date },
    expDate: { type: Date },
    purchasePrice: { type: Number },
    sellingPrice: { type: Number },
  }],
  isActive: { type: Boolean, default: true },
  isService: { type: Boolean, default: false },
  tags: [{ type: String }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

productSchema.index({ shopId: 1, branchId: 1 });
productSchema.index({ shopId: 1, sku: 1 }, { unique: true });
productSchema.index({ shopId: 1, barcode: 1 }, { sparse: true });
productSchema.index({ shopId: 1, category: 1 });
productSchema.index({ name: 'text', sku: 'text', 'nameLocal.hi': 'text' });
productSchema.index({ 'inventory.quantity': 1 });
productSchema.index({ 'batches.expDate': 1 });

productSchema.virtual('isLowStock').get(function () {
  return this.inventory.quantity <= this.inventory.minStockLevel;
});

productSchema.virtual('isOutOfStock').get(function () {
  return this.inventory.quantity <= 0;
});

productSchema.virtual('stockStatus').get(function () {
  if (this.inventory.quantity <= 0) return 'out_of_stock';
  if (this.inventory.quantity <= this.inventory.minStockLevel) return 'low';
  return 'in_stock';
});

module.exports = mongoose.model('Product', productSchema);
