const mongoose = require('mongoose');

const inventoryLogSchema = new mongoose.Schema({
  shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true },
  branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', default: null },
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  type: {
    type: String,
    enum: [
      'sale', 'purchase', 'purchase_return', 'sale_return',
      'stock_adjustment', 'stock_transfer_in', 'stock_transfer_out',
      'opening_stock', 'damage', 'theft', 'audit', 'manual'
    ],
    required: true,
  },
  quantity: { type: Number, required: true },
  previousStock: { type: Number, required: true },
  newStock: { type: Number, required: true },
  reference: { type: String },
  referenceId: { type: mongoose.Schema.Types.ObjectId },
  reason: { type: String },
  batchNumber: { type: String },
  costPrice: { type: Number },
  notes: { type: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, {
  timestamps: true,
});

inventoryLogSchema.index({ shopId: 1, branchId: 1, createdAt: -1 });
inventoryLogSchema.index({ shopId: 1, product: 1, createdAt: -1 });
inventoryLogSchema.index({ shopId: 1, type: 1 });
inventoryLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('InventoryLog', inventoryLogSchema);
