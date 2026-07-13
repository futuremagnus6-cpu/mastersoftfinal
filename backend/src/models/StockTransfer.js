const mongoose = require('mongoose');

const stockTransferSchema = new mongoose.Schema({
  shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true },
  transferNumber: { type: String, required: true },
  fromBranch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
  toBranch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
  items: [{
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    productName: { type: String },
    sku: { type: String },
    quantity: { type: Number, required: true },
    batchNumber: { type: String },
  }],
  status: {
    type: String,
    enum: ['draft', 'pending', 'in_transit', 'received', 'cancelled'],
    default: 'draft',
  },
  transferDate: { type: Date, default: Date.now },
  receivedDate: { type: Date },
  notes: { type: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, {
  timestamps: true,
});

stockTransferSchema.index({ shopId: 1, transferNumber: 1 }, { unique: true });
stockTransferSchema.index({ shopId: 1, status: 1 });

module.exports = mongoose.model('StockTransfer', stockTransferSchema);
