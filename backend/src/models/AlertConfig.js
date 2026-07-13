const mongoose = require('mongoose');

const alertConfigSchema = new mongoose.Schema({
  shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true },
  type: {
    type: String,
    enum: [
      'missing_customer_id', 'low_stock', 'out_of_stock', 'expiry',
      'pending_payment', 'large_order', 'failed_payment', 'suspicious_login',
      'new_customer', 'daily_sales_report', 'weekly_report', 'monthly_report',
      'gst_filing_due', 'subscription_renewal', 'payment_reconciliation',
    ],
    required: true,
    // Uniqueness is enforced by the compound index on { shopId, type } below
  },
  enabled: { type: Boolean, default: true },
  channels: {
    email: { type: Boolean, default: true },
    dashboard: { type: Boolean, default: true },
    whatsapp: { type: Boolean, default: false },
    sms: { type: Boolean, default: false },
  },
  recipients: {
    shopAdmin: { type: Boolean, default: true },
    manager: { type: Boolean, default: false },
    staff: { type: Boolean, default: false },
    customEmails: [{ type: String }],
  },
  thresholds: {
    lowStockLevel: { type: Number, default: 10 },
    largeOrderAmount: { type: Number, default: 50000 },
    expiryDays: { type: Number, default: 30 },
    pendingPaymentDays: { type: Number, default: 7 },
  },
  schedule: {
    dailyReportTime: { type: String, default: '20:00' },
    weeklyReportDay: { type: Number, default: 1 }, // 0=Sunday
    weeklyReportTime: { type: String, default: '09:00' },
    monthlyReportDay: { type: Number, default: 1 },
    monthlyReportTime: { type: String, default: '09:00' },
  },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, {
  timestamps: true,
});

alertConfigSchema.index({ shopId: 1, type: 1 }, { unique: true });

module.exports = mongoose.model('AlertConfig', alertConfigSchema);
