const mongoose = require('mongoose');

const branchSchema = new mongoose.Schema({
  shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true },
  name: { type: String, required: [true, 'Branch name is required'], trim: true },
  code: { type: String, trim: true },
  address: {
    line1: { type: String },
    line2: { type: String },
    city: { type: String, required: true },
    state: { type: String, required: true },
    pincode: { type: String },
  },
  contact: {
    phone: { type: String },
    email: { type: String },
  },
  isActive: { type: Boolean, default: true },
  isHeadOffice: { type: Boolean, default: false },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, {
  timestamps: true,
});

branchSchema.index({ shopId: 1, isActive: 1 });
branchSchema.index({ shopId: 1, code: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Branch', branchSchema);
