const mongoose = require('mongoose');

const enquirySchema = new mongoose.Schema({
  name: { type: String, required: [true, 'Name is required'], trim: true },
  email: { type: String, required: [true, 'Email is required'], trim: true, lowercase: true },
  phone: { type: String, trim: true, default: '' },
  company: { type: String, trim: true, default: '' },
  message: { type: String, required: [true, 'Message is required'], trim: true },
  status: {
    type: String,
    enum: ['new', 'read', 'replied', 'closed'],
    default: 'new',
  },
  notes: { type: String, trim: true },
  repliedAt: { type: Date },
  repliedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  source: { type: String, default: 'website' },
  ip: { type: String },
}, {
  timestamps: true,
});

enquirySchema.index({ status: 1 });
enquirySchema.index({ createdAt: -1 });

module.exports = mongoose.model('Enquiry', enquirySchema);
