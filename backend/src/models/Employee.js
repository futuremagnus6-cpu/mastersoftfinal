const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema({
  shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true },
  branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', default: null },
  employeeCode: { type: String, required: true, trim: true },
  name: { type: String, required: [true, 'Name is required'], trim: true },
  mobile: { type: String, required: [true, 'Mobile is required'], trim: true },
  email: { type: String, lowercase: true, trim: true },
  department: { type: String },
  designation: { type: String },
  dob: { type: Date },
  doj: { type: Date, required: true },
  gender: { type: String, enum: ['male', 'female', 'other'] },
  documents: {
    aadhaar: { type: String },
    pan: { type: String },
    bankAccount: { type: String },
    ifsc: { type: String },
    uan: { type: String },
    esiNumber: { type: String },
  },
  address: {
    line1: { type: String },
    line2: { type: String },
    city: { type: String },
    state: { type: String },
    pincode: { type: String },
  },
  salary: {
    basic: { type: Number, default: 0 },
    hra: { type: Number, default: 0 },
    da: { type: Number, default: 0 },
    conveyance: { type: Number, default: 0 },
    medical: { type: Number, default: 0 },
    special: { type: Number, default: 0 },
    grossSalary: { type: Number, default: 0 },
    deductions: {
      pf: { type: Number, default: 0 },
      esi: { type: Number, default: 0 },
      professionalTax: { type: Number, default: 0 },
      tds: { type: Number, default: 0 },
      otherDeductions: { type: Number, default: 0 },
    },
    netSalary: { type: Number, default: 0 },
    incentiveTarget: { type: Number, default: 0 },
    incentivePercent: { type: Number, default: 0 },
  },
  attendance: {
    type: { type: String, enum: ['manual', 'biometric'], default: 'manual' },
    workingDays: { type: Number, default: 26 },
  },
  leave: {
    annual: { type: Number, default: 12 },
    sick: { type: Number, default: 6 },
    casual: { type: Number, default: 6 },
    earned: { type: Number, default: 0 },
  },
  bankDetails: {
    accountName: { type: String },
    accountNumber: { type: String },
    ifsc: { type: String },
    bankName: { type: String },
    branch: { type: String },
  },
  performance: {
    monthlyTarget: { type: Number, default: 0 },
    currentAchievement: { type: Number, default: 0 },
    rating: { type: Number, min: 1, max: 5 },
  },
  isActive: { type: Boolean, default: true },
  resignationDate: { type: Date },
  lastWorkingDate: { type: Date },
  notes: { type: String },
  // ─── Login & Priority ───
  hasLogin: { type: Boolean, default: false },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  priority: { type: Number, default: 0, min: 0, max: 100, description: 'Higher = more important' },
  loginEmail: { type: String, lowercase: true, trim: true, sparse: true },
  userRole: { type: String, enum: ['staff', 'manager', 'shop_admin'], default: 'staff' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, {
  timestamps: true,
});

employeeSchema.index({ shopId: 1, employeeCode: 1 }, { unique: true });
employeeSchema.index({ shopId: 1, department: 1 });
employeeSchema.index({ shopId: 1, isActive: 1 });

module.exports = mongoose.model('Employee', employeeSchema);
