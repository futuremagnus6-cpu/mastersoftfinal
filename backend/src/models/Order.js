const mongoose = require('mongoose');

const orderCustomerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  customerId: { type: String },
  phone: { type: String },
}, { _id: false });

const orderItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  productName: { type: String, required: true },
  sku: { type: String },
  barcode: { type: String },
  hsnCode: { type: String },
  quantity: { type: Number, required: true, min: 0.001 },
  mrp: { type: Number, required: true },
  sellingPrice: { type: Number, required: true },
  discountPercent: { type: Number, default: 0, min: 0, max: 100 },
  discountAmount: { type: Number, default: 0 },
  gstRate: { type: Number, default: 0 },
  gstAmount: { type: Number, default: 0 },
  cgst: { type: Number, default: 0 },
  sgst: { type: Number, default: 0 },
  igst: { type: Number, default: 0 },
  cessAmount: { type: Number, default: 0 },
  taxableAmount: { type: Number, default: 0 },
  total: { type: Number, required: true },
  batchNumber: { type: String },
  expDate: { type: Date },
  isReturned: { type: Boolean, default: false },
  returnedQty: { type: Number, default: 0 },
});

const paymentSchema = new mongoose.Schema({
  method: {
    type: String,
    enum: ['cash', 'upi', 'card', 'company', 'credit', 'mixed', 'advance'],
    required: true,
  },
  amount: { type: Number, required: true },
  // Cash
  // (no extra fields for cash beyond amount)
  // UPI / Online
  upiApp: { type: String },
  upiTransactionId: { type: String },
  transactionMethod: { type: String }, // For online/card: e.g., 'UPI', 'Net Banking', 'Credit Card', 'Debit Card'
  transactionId: { type: String },     // Generic transaction ID
  // Card
  cardReceiptNumber: { type: String },
  // Company (credit / purchase order)
  companyOrderNumber: { type: String },
  companyOrderDate: { type: Date },
  companyNote: { type: String },
  reference: { type: String },
  status: { type: String, enum: ['pending', 'completed', 'failed', 'refunded'], default: 'completed' },
  razorpayPaymentId: { type: String },
  razorpayOrderId: { type: String },
});

const orderSchema = new mongoose.Schema({
  shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true },
  branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', default: null },
  orderNumber: { type: String, required: true },
  invoiceNumber: { type: String },
  // Single primary customer (backward compatibility)
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', default: null },
  customerName: { type: String },
  customerMobile: { type: String },
  customerGstin: { type: String },
  customerId: { type: String },
  // Multi-customer support
  customers: [orderCustomerSchema],
  type: { type: String, enum: ['retail', 'wholesale', 'dealer', 'online'], default: 'retail' },
  items: [orderItemSchema],
  subtotal: { type: Number, required: true },
  totalDiscount: { type: Number, default: 0 },
  totalGst: { type: Number, default: 0 },
  totalCgst: { type: Number, default: 0 },
  totalSgst: { type: Number, default: 0 },
  totalIgst: { type: Number, default: 0 },
  totalCess: { type: Number, default: 0 },
  roundOff: { type: Number, default: 0 },
  grandTotal: { type: Number, required: true },
  payments: [paymentSchema],
  paymentStatus: {
    type: String,
    enum: ['pending', 'partial', 'completed', 'refunded'],
    default: 'pending',
  },
  paidAmount: { type: Number, default: 0 },
  balanceDue: { type: Number, default: 0 },
  isPartialPayment: { type: Boolean, default: false },
  status: {
    type: String,
    enum: ['pending', 'completed', 'cancelled', 'returned', 'partial_return'],
    default: 'completed',
  },
  posMode: { type: Boolean, default: true },
  isOffline: { type: Boolean, default: false },
  offlineId: { type: String },
  syncStatus: { type: String, enum: ['pending', 'synced', 'conflict'], default: 'synced' },
  notes: { type: String },
  gstInvoiceType: { type: String, enum: ['b2b', 'b2c'], default: 'b2c' },
  irn: { type: String },
  irnQrCode: { type: String },
  ewayBillNumber: { type: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

orderSchema.index({ shopId: 1, branchId: 1, createdAt: -1 });
orderSchema.index({ shopId: 1, orderNumber: 1 }, { unique: true });
orderSchema.index({ shopId: 1, customer: 1 });
orderSchema.index({ shopId: 1, status: 1 });
orderSchema.index({ shopId: 1, 'payment.status': 1 });
orderSchema.index({ shopId: 1, createdAt: -1 });
orderSchema.index({ 'payments.razorpayPaymentId': 1 }, { sparse: true });

orderSchema.pre('save', function (next) {
  this.balanceDue = this.grandTotal - this.paidAmount;
  this.isPartialPayment = this.paymentStatus === 'partial';
  next();
});

module.exports = mongoose.model('Order', orderSchema);
