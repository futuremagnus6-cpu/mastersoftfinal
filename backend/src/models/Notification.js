const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', default: null },
  branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', default: null },
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  recipientRole: { type: String, enum: ['super_admin', 'shop_admin', 'manager', 'staff', 'customer'] },
  type: {
    type: String,
    enum: [
      'order_created', 'order_pending', 'payment_received', 'payment_failed',
      'low_stock', 'out_of_stock', 'expiry_alert', 'new_customer',
      'daily_report', 'weekly_report', 'monthly_report',
      'gst_filing_due', 'subscription_renewal', 'subscription_expired',
      'suspicious_login', 'large_order', 'missing_customer_id',
      'payment_reconciliation', 'return_requested', 'support_ticket',
      'system_announcement', 'shop_registered', 'backup_completed', 'backup_failed',
    ],
    required: true,
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  data: { type: mongoose.Schema.Types.Mixed },
  isRead: { type: Boolean, default: false },
  isUrgent: { type: Boolean, default: false },
  channel: {
    type: String,
    enum: ['email', 'dashboard', 'whatsapp', 'sms', 'push'],
    default: 'dashboard',
  },
  status: {
    type: String,
    enum: ['pending', 'sent', 'delivered', 'failed'],
    default: 'pending',
  },
  sentAt: { type: Date },
  deliveredAt: { type: Date },
  readAt: { type: Date },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, {
  timestamps: true,
});

notificationSchema.index({ shopId: 1, recipient: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ shopId: 1, type: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ status: 1 });

module.exports = mongoose.model('Notification', notificationSchema);
