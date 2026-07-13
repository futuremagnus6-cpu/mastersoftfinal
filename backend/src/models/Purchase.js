const mongoose = require('mongoose');

const purchaseItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  productName: { type: String, required: true },
  sku: { type: String },
  quantity: { type: Number, required: true, min: 0.001 },
  receivedQuantity: { type: Number, default: 0 },
  unitPrice: { type: Number, required: true },
  mrp: { type: Number },
  sellingPrice: { type: Number },
  gstRate: { type: Number, default: 0 },
  gstAmount: { type: Number, default: 0 },
  total: { type: Number, required: true },
  batchNumber: { type: String },
  mfgDate: { type: Date },
  expDate: { type: Date },
});

const purchaseSchema = new mongoose.Schema({
  shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true },
  branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', default: null },
  purchaseOrderNumber: { type: String, required: true },
  supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true },
  invoiceNumber: { type: String },
  invoiceDate: { type: Date },
  status: {
    type: String,
    enum: ['draft', 'sent', 'partial_received', 'received', 'cancelled'],
    default: 'draft',
  },
  items: [purchaseItemSchema],
  subtotal: { type: Number, required: true },
  totalGst: { type: Number, default: 0 },
  totalDiscount: { type: Number, default: 0 },
  shippingCharges: { type: Number, default: 0 },
  grandTotal: { type: Number, required: true },
  paidAmount: { type: Number, default: 0 },
  balanceDue: { type: Number, default: 0 },
  paymentStatus: { type: String, enum: ['pending', 'partial', 'paid'], default: 'pending' },
  paymentDueDate: { type: Date },
  notes: { type: String },
  grnNumber: { type: String },
  grnDate: { type: Date },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, {
  timestamps: true,
});

purchaseSchema.index({ shopId: 1, purchaseOrderNumber: 1 }, { unique: true });
purchaseSchema.index({ shopId: 1, supplier: 1 });
purchaseSchema.index({ shopId: 1, status: 1 });

module.exports = mongoose.model('Purchase', purchaseSchema);
