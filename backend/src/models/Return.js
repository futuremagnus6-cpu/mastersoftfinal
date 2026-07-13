const mongoose = require('mongoose');

const returnItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  productName: { type: String },
  quantity: { type: Number, required: true },
  reason: { type: String, enum: ['damage', 'wrong_item', 'expired', 'customer_changed_mind', 'quality_issue', 'other'] },
  reasonNote: { type: String },
  refundAmount: { type: Number, required: true },
  condition: { type: String, enum: ['new', 'opened', 'damaged', 'expired'] },
});

const returnSchema = new mongoose.Schema({
  shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true },
  branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', default: null },
  returnNumber: { type: String, required: true, unique: true },
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', default: null },
  items: [returnItemSchema],
  totalRefundAmount: { type: Number, required: true },
  refundMethod: {
    type: String,
    enum: ['cash', 'bank_transfer', 'upi', 'credit_balance', 'original_method'],
    default: 'original_method',
  },
  refundStatus: {
    type: String,
    enum: ['pending', 'approved', 'processed', 'completed', 'rejected'],
    default: 'pending',
  },
  creditNoteNumber: { type: String },
  creditNoteGenerated: { type: Boolean, default: false },
  gstAdjustment: {
    originalGstAmount: { type: Number, default: 0 },
    adjustedGstAmount: { type: Number, default: 0 },
  },
  status: { type: String, enum: ['requested', 'approved', 'received', 'completed', 'rejected'], default: 'requested' },
  notes: { type: String },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, {
  timestamps: true,
});

returnSchema.index({ shopId: 1, returnNumber: 1 }, { unique: true });
returnSchema.index({ shopId: 1, order: 1 });
returnSchema.index({ shopId: 1, status: 1 });

module.exports = mongoose.model('Return', returnSchema);
