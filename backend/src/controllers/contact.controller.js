const Enquiry = require('../models/Enquiry');
const config = require('../config');
const { AppError } = require('../middleware/errorHandler');
const logger = require('../config/logger');
const emailService = require('../services/emailService');

// @desc    Submit contact/enquiry form (public)
// @route   POST /api/contact
exports.submitEnquiry = async (req, res, next) => {
  try {
    const { name, email, phone, company, message } = req.body;

    if (!name || !name.trim()) throw new AppError('Name is required', 400);
    if (!email || !email.trim()) throw new AppError('Email is required', 400);
    if (!message || !message.trim()) throw new AppError('Message is required', 400);

    const enquiry = await Enquiry.create({
      name: name.trim(),
      email: email.trim(),
      phone: phone?.trim() || '',
      company: company?.trim() || '',
      message: message.trim(),
      source: req.headers['user-agent'] || 'website',
      ip: req.ip,
    });

    // Send email notification to super admin
    try {
      const superAdminEmail = config.superAdmin.email;
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head><meta charset="UTF-8"><style>
          body { font-family: Arial, sans-serif; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #2563eb, #1d4ed8); color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
          .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
          .field { margin-bottom: 15px; }
          .label { font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; }
          .value { font-size: 14px; color: #111827; margin-top: 2px; }
          .message-box { background: #fff; border: 1px solid #e5e7eb; border-radius: 5px; padding: 15px; margin-top: 5px; }
          .footer { background: #f3f4f6; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; }
          .badge { display: inline-block; background: #f59e0b; color: #fff; padding: 2px 10px; border-radius: 12px; font-size: 11px; }
        </style></head>
        <body>
          <div class="container">
            <div class="header"><h1>🔔 New Enquiry Received</h1></div>
            <div class="content">
              <div class="field"><div class="label">Name</div><div class="value">${enquiry.name}</div></div>
              <div class="field"><div class="label">Email</div><div class="value">${enquiry.email}</div></div>
              ${enquiry.phone ? `<div class="field"><div class="label">Phone</div><div class="value">${enquiry.phone}</div></div>` : ''}
              ${enquiry.company ? `<div class="field"><div class="label">Company</div><div class="value">${enquiry.company}</div></div>` : ''}
              <div class="field"><div class="label">Message</div><div class="message-box">${enquiry.message}</div></div>
              <div class="field"><div class="label">Enquiry ID</div><div class="value">${enquiry._id}</div></div>
              <div class="field"><div class="label">Status</div><div class="value"><span class="badge">New</span></div></div>
            </div>
            <div class="footer">
              <p>Received on ${new Date(enquiry.createdAt).toLocaleString('en-IN')}</p>
              <p style="margin-top:8px;">View in dashboard: ${config.frontendUrl}/super-admin/settings</p>
            </div>
          </div>
        </body>
        </html>
      `;

      await emailService.sendEmail(
        superAdminEmail,
        `New Enquiry: ${enquiry.name} - ${enquiry.email}`,
        htmlContent
      );
      logger.info(`Enquiry notification sent to super admin: ${superAdminEmail}`);
    } catch (emailError) {
      logger.warn(`Failed to send enquiry notification email: ${emailError.message}`);
    }

    res.status(201).json({
      success: true,
      message: 'Thank you! We have received your enquiry and will get back to you shortly.',
      data: { id: enquiry._id },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all enquiries (super admin only)
// @route   GET /api/contact
exports.getEnquiries = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, search } = req.query;
    const query = {};

    if (status) query.status = status;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { company: { $regex: search, $options: 'i' } },
        { message: { $regex: search, $options: 'i' } },
      ];
    }

    const enquiries = await Enquiry.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Enquiry.countDocuments(query);
    const newCount = await Enquiry.countDocuments({ status: 'new' });

    res.json({
      success: true,
      data: enquiries,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
      meta: {
        newCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update enquiry status (super admin only)
// @route   PUT /api/contact/:id
exports.updateEnquiry = async (req, res, next) => {
  try {
    const { status, notes } = req.body;
    const update = {};

    if (status) update.status = status;
    if (notes !== undefined) update.notes = notes;
    if (status === 'replied') {
      update.repliedAt = new Date();
      update.repliedBy = req.userId;
    }

    const enquiry = await Enquiry.findByIdAndUpdate(
      req.params.id,
      update,
      { new: true, runValidators: true }
    );

    if (!enquiry) throw new AppError('Enquiry not found', 404);

    res.json({
      success: true,
      message: 'Enquiry updated successfully',
      data: enquiry,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single enquiry
// @route   GET /api/contact/:id
exports.getEnquiry = async (req, res, next) => {
  try {
    const enquiry = await Enquiry.findById(req.params.id);
    if (!enquiry) throw new AppError('Enquiry not found', 404);
    res.json({ success: true, data: enquiry });
  } catch (error) {
    next(error);
  }
};

// @desc    Get enquiry stats for super admin dashboard
// @route   GET /api/contact/stats
exports.getEnquiryStats = async (req, res, next) => {
  try {
    const [total, newCount, todayCount] = await Promise.all([
      Enquiry.countDocuments(),
      Enquiry.countDocuments({ status: 'new' }),
      Enquiry.countDocuments({
        createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      }),
    ]);

    res.json({
      success: true,
      data: { total, new: newCount, today: todayCount },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = exports;
