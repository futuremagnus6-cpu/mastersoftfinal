const mongoose = require('mongoose');

const ticketMessageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  senderName: { type: String },
  senderRole: { type: String, enum: ['customer', 'staff', 'manager', 'shop_admin', 'super_admin'] },
  message: { type: String, required: true },
  attachments: [{ type: String }],
  isInternal: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

const supportTicketSchema = new mongoose.Schema({
  shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true },
  branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', default: null },
  ticketNumber: { type: String, required: true, unique: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', default: null },
  customerName: { type: String },
  customerMobile: { type: String },
  customerEmail: { type: String },
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null },
  category: {
    type: String,
    enum: ['order_issue', 'payment_issue', 'product_issue', 'delivery', 'general', 'return', 'other'],
    required: true,
  },
  priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
  subject: { type: String, required: true },
  description: { type: String, required: true },
  attachments: [{ type: String }],
  status: {
    type: String,
    enum: ['open', 'assigned', 'in_progress', 'resolved', 'closed'],
    default: 'open',
  },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  messages: [ticketMessageSchema],
  sla: {
    responseHours: { type: Number, default: 24 },
    resolutionHours: { type: Number, default: 72 },
    breachedAt: { type: Date },
    firstResponseAt: { type: Date },
    resolvedAt: { type: Date },
  },
  source: { type: String, enum: ['portal', 'whatsapp', 'phone', 'pos', 'email'], default: 'portal' },
  rating: { type: Number, min: 1, max: 5 },
  ratingComment: { type: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, {
  timestamps: true,
});

supportTicketSchema.index({ shopId: 1, status: 1 });
supportTicketSchema.index({ shopId: 1, priority: 1 });
supportTicketSchema.index({ shopId: 1, assignedTo: 1 });
supportTicketSchema.index({ createdAt: -1 });

module.exports = mongoose.model('SupportTicket', supportTicketSchema);
