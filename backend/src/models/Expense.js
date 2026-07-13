const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true },
  branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', default: null },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: [
      'rent', 'salary', 'marketing', 'electricity', 'internet',
      'maintenance', 'transport', 'packaging', 'utilities',
      'insurance', 'taxes', 'professional_fees', 'office_supplies',
      'staff_welfare', 'depreciation', 'miscellaneous'
    ],
  },
  subcategory: { type: String },
  amount: { type: Number, required: true, min: 0 },
  description: { type: String, required: true },
  date: { type: Date, required: true, default: Date.now },
  paymentMethod: {
    type: String,
    enum: ['cash', 'bank_transfer', 'cheque', 'upi', 'card', 'credit'],
    default: 'cash',
  },
  reference: { type: String },
  vendor: { type: String },
  receipt: { type: String },
  isRecurring: { type: Boolean, default: false },
  recurringInterval: {
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'],
  },
  recurringEndDate: { type: Date },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'approved' },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  notes: { type: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, {
  timestamps: true,
});

expenseSchema.index({ shopId: 1, date: -1 });
expenseSchema.index({ shopId: 1, category: 1 });
expenseSchema.index({ shopId: 1, status: 1 });

module.exports = mongoose.model('Expense', expenseSchema);
