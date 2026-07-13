const Shop = require('../models/Shop');
const Branch = require('../models/Branch');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const { AppError } = require('../middleware/errorHandler');
const { getCleanShopId } = require('../middleware/multiTenant');
const { getDefaultPermissions } = require('../middleware/rbac');
const logger = require('../config/logger');
const emailService = require('../services/emailService');

// @desc    Create a new shop (Super Admin only)
// @route   POST /api/shops
exports.createShop = async (req, res, next) => {
  try {
    const {
      name, businessType, customBusinessType, gstin, pan,
      address, contact, settings, features, limits,
      subscriptionPlan, adminEmail, password, isTrial, trialDays
    } = req.body;

    const temporaryPassword = password || 'Admin@123';

    // Determine subscription config (trial vs. plan)
    let subscriptionConfig;
    if (subscriptionPlan) {
      subscriptionConfig = { plan: subscriptionPlan, status: 'active' };
    } else if (isTrial) {
      const trialEnd = new Date();
      trialEnd.setDate(trialEnd.getDate() + (trialDays || 14));
      subscriptionConfig = { status: 'trial', trialEndsAt: trialEnd };
    }

    const shop = new Shop({
      name,
      businessType,
      customBusinessType,
      gstin,
      pan,
      address,
      contact,
      settings,
      features: { ...shopDefaultFeatures(businessType), ...features },
      limits: { ...limits },
      subscription: subscriptionConfig,
      createdBy: req.userId,
    });

    await shop.save();

    // Create default branch (Head Office)
    const branch = new Branch({
      shopId: shop._id,
      name: 'Head Office',
      code: 'HO-001',
      address: address,
      contact: contact,
      isHeadOffice: true,
      createdBy: req.userId,
    });
    await branch.save();

    // Create shop admin user
    const finalAdminEmail = adminEmail || contact?.email || `admin@${shop._id}.com`;
    const adminUser = new User({
      shopId: shop._id,
      branchId: branch._id,
      name: `${name} Admin`,
      email: finalAdminEmail,
      phone: contact?.phone,
      password: temporaryPassword,
      role: 'shop_admin',
      permissions: getDefaultPermissions('shop_admin'),
      createdBy: req.userId,
    });
    await adminUser.save();

    shop.usage.currentBranches = 1;
    shop.usage.currentUsers = 1;
    await shop.save();

    // Send welcome email to shop admin
    try {
      await emailService.sendWelcomeEmail(finalAdminEmail, adminUser.name, shop.name, temporaryPassword);
    } catch (emailError) {
      logger.warn(`Failed to send welcome email to ${finalAdminEmail}:`, emailError.message);
      // Continue without failing the request
    }

    // Notify super admins about new shop
    try {
      const Notification = require('../models/Notification');
      const superAdmins = await User.find({ role: 'super_admin' }).select('_id');
      if (superAdmins.length > 0) {
        const notifications = superAdmins.map(sa => ({
          type: 'shop_registered',
          title: 'New Shop Created',
          message: `Shop "${shop.name}" created by super admin. Admin: ${finalAdminEmail}`,
          channel: 'dashboard',
          recipient: sa._id,
          status: 'sent',
          sentAt: new Date(),
          createdBy: req.userId,
        }));
        await Notification.insertMany(notifications);
      }
    } catch (notifErr) {
      logger.warn(`Failed to notify super admins about new shop: ${notifErr.message}`);
    }

    await AuditLog.create({
      user: req.userId,
      action: 'create',
      resource: 'Shop',
      resourceId: shop._id,
      description: `Created shop: ${shop.name} (${shop.businessType}) with admin: ${finalAdminEmail}`,
      ip: req.ip,
    });

    res.status(201).json({
      success: true,
      message: 'Shop created successfully. Welcome email sent to shop admin.',
      data: {
        shop,
        branch,
        admin: { 
          email: adminUser.email, 
          name: adminUser.name,
          temporaryPassword: temporaryPassword,
          emailSent: true 
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all shops (Super Admin)
// @route   GET /api/shops
exports.getShops = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, businessType, search } = req.query;
    const query = {};

    if (status) query.status = status;
    if (businessType) query.businessType = businessType;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { 'contact.email': { $regex: search, $options: 'i' } },
        { 'contact.phone': { $regex: search, $options: 'i' } },
        { gstin: { $regex: search, $options: 'i' } },
      ];
    }

    const shops = await Shop.find(query)
      .populate('subscription.plan', 'name monthlyPrice')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Shop.countDocuments(query);

    res.json({
      success: true,
      data: shops,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single shop
// @route   GET /api/shops/:id
exports.getShop = async (req, res, next) => {
  try {
    // shop_admin can only view their own shop
    if (req.user.role !== 'super_admin') {
      const userShopId = getCleanShopId(req.user.shopId);
      if (!userShopId || String(userShopId) !== String(req.params.id)) {
        throw new AppError('Access denied. You can only view your own shop.', 403);
      }
    }

    const shop = await Shop.findById(req.params.id)
      .populate('subscription.plan', 'name monthlyPrice annualPrice features')
      .populate('branches');

    if (!shop) {
      throw new AppError('Shop not found', 404);
    }

    res.json({ success: true, data: shop });
  } catch (error) {
    next(error);
  }
};

// @desc    Update shop
// @route   PUT /api/shops/:id
exports.updateShop = async (req, res, next) => {
  try {
    // shop_admin can only update their own shop
    if (req.user.role !== 'super_admin') {
      const userShopId = getCleanShopId(req.user.shopId);
      if (!userShopId || String(userShopId) !== String(req.params.id)) {
        throw new AppError('Access denied. You can only update your own shop.', 403);
      }
    }
    const allowedFields = [
      'name', 'businessType', 'customBusinessType', 'gstin', 'pan',
      'address', 'contact', 'logo', 'branding',
      'settings', 'features', 'limits', 'subscriptionPlan'
    ];

    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        if (field === 'subscriptionPlan') {
          updates['subscription.plan'] = req.body[field];
          // When subscription plan changes, sync the plan's features to the shop
          if (req.body[field]) {
            const SubscriptionPlan = require('../models/SubscriptionPlan');
            const plan = await SubscriptionPlan.findById(req.body[field]);
            if (plan && plan.features) {
              updates.features = plan.features;
              updates.limits = plan.limits;
            }
          }
        } else {
          updates[field] = req.body[field];
        }
      }
    }
    updates.updatedBy = req.userId;

    const shop = await Shop.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    });

    if (!shop) {
      throw new AppError('Shop not found', 404);
    }

    await AuditLog.create({
      user: req.userId,
      action: 'update',
      resource: 'Shop',
      resourceId: shop._id,
      description: `Updated shop: ${shop.name}`,
      changes: updates,
      ip: req.ip,
    });

    res.json({ success: true, message: 'Shop updated successfully', data: shop });
  } catch (error) {
    next(error);
  }
};

// @desc    Activate shop
// @route   PUT /api/shops/:id/activate
exports.activateShop = async (req, res, next) => {
  try {
    const shop = await Shop.findByIdAndUpdate(
      req.params.id,
      { status: 'active', activatedAt: new Date(), updatedBy: req.userId },
      { new: true }
    );

    if (!shop) throw new AppError('Shop not found', 404);

    await AuditLog.create({
      user: req.userId,
      action: 'update',
      resource: 'Shop',
      resourceId: shop._id,
      description: `Activated shop: ${shop.name}`,
      ip: req.ip,
    });

    res.json({ success: true, message: 'Shop activated', data: shop });
  } catch (error) {
    next(error);
  }
};

// @desc    Suspend shop
// @route   PUT /api/shops/:id/suspend
exports.suspendShop = async (req, res, next) => {
  try {
    const shop = await Shop.findByIdAndUpdate(
      req.params.id,
      { status: 'suspended', suspendedAt: new Date(), updatedBy: req.userId },
      { new: true }
    );

    if (!shop) throw new AppError('Shop not found', 404);

    // Deactivate all users for this shop
    await User.updateMany({ shopId: shop._id }, { isActive: false });

    await AuditLog.create({
      user: req.userId,
      action: 'update',
      resource: 'Shop',
      resourceId: shop._id,
      description: `Suspended shop: ${shop.name}`,
      ip: req.ip,
    });

    res.json({ success: true, message: 'Shop suspended', data: shop });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete shop
// @route   DELETE /api/shops/:id
exports.deleteShop = async (req, res, next) => {
  try {
    const shop = await Shop.findByIdAndUpdate(
      req.params.id,
      { status: 'disabled', updatedBy: req.userId },
      { new: true }
    );

    if (!shop) throw new AppError('Shop not found', 404);

    await User.updateMany({ shopId: shop._id }, { isActive: false });

    await AuditLog.create({
      user: req.userId,
      action: 'delete',
      resource: 'Shop',
      resourceId: shop._id,
      description: `Deleted shop: ${shop.name}`,
      ip: req.ip,
    });

    res.json({ success: true, message: 'Shop deleted/disabled' });
  } catch (error) {
    next(error);
  }
};

// @desc    Get shop dashboard stats
// @route   GET /api/shops/:id/stats
exports.getShopStats = async (req, res, next) => {
  try {
    const Order = require('../models/Order');
    const Product = require('../models/Product');
    const Customer = require('../models/Customer');
    const Employee = require('../models/Employee');
    const shop = await Shop.findById(req.params.id);

    if (!shop) throw new AppError('Shop not found', 404);

    const [
      todayOrders, totalOrders, totalProducts, totalCustomers,
      totalEmployees, todayRevenue, monthlyRevenue
    ] = await Promise.all([
      Order.countDocuments({ shopId: shop._id, createdAt: { $gte: new Date().setHours(0, 0, 0, 0) } }),
      Order.countDocuments({ shopId: shop._id }),
      Product.countDocuments({ shopId: shop._id, isActive: true }),
      Customer.countDocuments({ shopId: shop._id, isActive: true }),
      Employee.countDocuments({ shopId: shop._id, isActive: true }),
      Order.aggregate([
        { $match: { shopId: shop._id, createdAt: { $gte: new Date().setHours(0, 0, 0, 0) }, status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$grandTotal' } } },
      ]),
      Order.aggregate([
        { $match: { shopId: shop._id, createdAt: { $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) }, status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$grandTotal' } } },
      ]),
    ]);

    res.json({
      success: true,
      data: {
        todayOrders,
        totalOrders,
        totalProducts,
        totalCustomers,
        totalEmployees,
        todayRevenue: todayRevenue[0]?.total || 0,
        monthlyRevenue: monthlyRevenue[0]?.total || 0,
        usage: shop.usage,
        subscription: shop.subscription,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Send password reset link to shop admin
// @route   POST /api/shops/:id/send-reset-link
exports.sendAdminPasswordResetLink = async (req, res, next) => {
  try {
    const { id: shopId } = req.params;
    const shop = await Shop.findById(shopId);

    if (!shop) {
      throw new AppError('Shop not found', 404);
    }

    // Find shop admin user
    const shopAdmin = await User.findOne({
      shopId: shop._id,
      role: 'shop_admin',
    });

    if (!shopAdmin) {
      throw new AppError('Shop admin not found', 404);
    }

    // Generate password reset token
    const resetToken = shopAdmin.generatePasswordResetToken();
    await shopAdmin.save();

    // Send email
    const { sendPasswordResetEmail } = require('../services/emailService');
    const emailResult = await sendPasswordResetEmail(
      shopAdmin.email,
      shopAdmin.name,
      resetToken,
      shop.name
    );

    if (!emailResult.success) {
      throw new AppError('Failed to send reset email. Please try again.', 500);
    }

    // Log the action
    await AuditLog.create({
      user: req.userId,
      action: 'send_password_reset',
      resource: 'Shop',
      resourceId: shop._id,
      description: `Sent password reset link to shop admin: ${shopAdmin.email} for shop: ${shop.name}`,
      ip: req.ip,
    });

    res.json({
      success: true,
      message: 'Password reset link sent successfully to shop admin',
      data: {
        email: shopAdmin.email,
        name: shopAdmin.name,
        shopName: shop.name,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get shop admin details for password reset
// @route   GET /api/shops/:id/admin
exports.getShopAdmin = async (req, res, next) => {
  try {
    const { id: shopId } = req.params;
    const shop = await Shop.findById(shopId);

    if (!shop) {
      throw new AppError('Shop not found', 404);
    }

    const shopAdmin = await User.findOne({
      shopId: shop._id,
      role: 'shop_admin',
    }).select('-password -refreshToken -resetPasswordToken -resetPasswordExpires -otp -otpExpires -twoFactorSecret');

    if (!shopAdmin) {
      throw new AppError('Shop admin not found', 404);
    }

    res.json({
      success: true,
      data: {
        admin: shopAdmin,
        shopName: shop.name,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Public shop registration (self-signup)
// @route   POST /api/shops/register
exports.registerShop = async (req, res, next) => {
  try {
    const {
      name, businessType, customBusinessType, gstin, pan,
      address, contact, settings, features, limits,
      adminName, adminEmail, password,
    } = req.body;

    if (!adminEmail || !password) {
      throw new AppError('Admin email and password are required', 400);
    }

    // Check admin email uniqueness
    const existingUser = await User.findOne({ email: adminEmail });
    if (existingUser) {
      throw new AppError('Email already registered', 409);
    }

    // Find the default plan (first active one)
    const defaultPlan = await require('../models/SubscriptionPlan').findOne({ isActive: true }).sort({ sortOrder: 1, monthlyPrice: 1 });

    // Set trial period
    const trialDays = defaultPlan?.trialPeriod || 14;
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + trialDays);

    const shop = new Shop({
      name,
      businessType,
      customBusinessType,
      gstin,
      pan,
      address,
      contact,
      settings: { ...settings },
      features: { ...shopDefaultFeatures(businessType), ...features },
      limits: { ...limits },
      subscription: {
        plan: defaultPlan?._id || null,
        status: 'trial',
        trialEndsAt: trialEnd,
      },
    });

    await shop.save();

    // Create default branch
    const Branch = require('../models/Branch');
    const branch = new Branch({
      shopId: shop._id,
      name: 'Head Office',
      code: 'HO-001',
      address,
      contact,
      isHeadOffice: true,
    });
    await branch.save();

    // Create shop admin user
    const temporaryPassword = password;
    const adminUser = new User({
      shopId: shop._id,
      branchId: branch._id,
      name: adminName || `${name} Admin`,
      email: adminEmail,
      phone: contact?.phone,
      password: temporaryPassword,
      role: 'shop_admin',
      permissions: getDefaultPermissions('shop_admin'),
      isVerified: true,
    });
    await adminUser.save();

    shop.usage.currentBranches = 1;
    shop.usage.currentUsers = 1;
    await shop.save();

    // Generate auth token for auto-login
    const jwt = require('jsonwebtoken');
    const config = require('../config');
    const { token, refreshToken } = (() => {
      const t = jwt.sign({ id: adminUser._id, role: adminUser.role }, config.jwt.secret, { expiresIn: config.jwt.expiresIn });
      const rt = jwt.sign({ id: adminUser._id, role: adminUser.role }, config.jwt.refreshSecret, { expiresIn: config.jwt.refreshExpiresIn });
      return { token: t, refreshToken: rt };
    })();
    adminUser.refreshToken = refreshToken;
    await adminUser.save();

    // Send welcome email
    try {
      await emailService.sendWelcomeEmail(adminEmail, adminUser.name, shop.name, temporaryPassword);
    } catch (emailError) {
      logger.warn(`Failed to send welcome email to ${adminEmail}:`, emailError.message);
    }

    // Notify super admins about new shop registration
    try {
      const Notification = require('../models/Notification');
      const superAdmins = await User.find({ role: 'super_admin' }).select('_id');
      for (const sa of superAdmins) {
        await Notification.create({
          type: 'shop_registered',
          title: 'New Shop Registered',
          message: `New shop "${shop.name}" (${businessType}) registered by ${adminName || adminEmail}. Trial ends: ${trialEnd.toLocaleDateString('en-IN')}`,
          channel: 'dashboard',
          recipient: sa._id,
          createdBy: adminUser._id,
        });
      }
    } catch (notifErr) {
      logger.warn(`Failed to notify super admins about new shop: ${notifErr.message}`);
    }

    // Audit log
    await AuditLog.create({
      user: adminUser._id,
      action: 'create',
      resource: 'Shop',
      resourceId: shop._id,
      description: `Shop registered via self-signup: ${shop.name}`,
      ip: req.ip,
    });

    res.status(201).json({
      success: true,
      message: 'Shop registered successfully! You are now on a free trial.',
      token,
      refreshToken,
      data: {
        shop,
        user: {
          id: adminUser._id,
          name: adminUser.name,
          email: adminUser.email,
          role: adminUser.role,
          shopId: shop._id,
        },
        trialEndsAt: trialEnd,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Helper: Get default features based on business type
function shopDefaultFeatures(businessType) {
  const common = {
    pos: true, inventory: true, crm: true, suppliers: true, purchases: true,
    expenses: true, lowStockAlerts: true, expiryAlerts: true, gstModule: true,
    barcodeScanner: true, emailNotifications: true,
  };

  const typeSpecifics = {
    medical_store: { employees: false, loyalty: true, ecommerce: false, multiBranch: false, whatsappNotifications: true },
    pharmacy: { employees: false, loyalty: true, ecommerce: false, multiBranch: false, batchTracking: true, whatsappNotifications: true },
    distributor: { employees: true, loyalty: false, ecommerce: false, multiBranch: true, suppliers: true, purchases: true, whatsappNotifications: false },
    grocery_store: { employees: true, loyalty: true, ecommerce: true, multiBranch: true },
    supermarket: { employees: true, loyalty: true, ecommerce: true, multiBranch: true, whatsappNotifications: true },
    electronics_shop: { employees: true, loyalty: true, ecommerce: true, multiBranch: false },
    mobile_shop: { employees: true, loyalty: true, ecommerce: true, multiBranch: false },
    cosmetics_shop: { employees: true, loyalty: true, ecommerce: true, multiBranch: false },
    hardware_shop: { employees: false, loyalty: false, ecommerce: false, multiBranch: true, suppliers: true, purchases: true },
    riyansh_mlm: { employees: true, loyalty: true, ecommerce: false, multiBranch: true, referralSystem: true, affiliateSystem: true },
    custom: { employees: true, loyalty: true, ecommerce: true, multiBranch: true },
  };

  return { ...common, ...(typeSpecifics[businessType] || typeSpecifics.custom) };
}

// @desc    Close trial early for a shop
// @route   PUT /api/shops/:id/close-trial
exports.closeTrial = async (req, res, next) => {
  try {
    const shop = await Shop.findById(req.params.id);

    if (!shop) {
      throw new AppError('Shop not found', 404);
    }

    if (shop.subscription?.status !== 'trial') {
      throw new AppError('Shop is not on a trial', 400);
    }

    // End trial immediately, set to expired
    shop.subscription.status = 'expired';
    shop.subscription.trialEndsAt = new Date();
    await shop.save();

    await AuditLog.create({
      user: req.userId,
      action: 'close_trial',
      resource: 'Shop',
      resourceId: shop._id,
      description: `Closed trial early for shop: ${shop.name}`,
      ip: req.ip,
    });

    res.json({ success: true, message: 'Trial closed successfully', data: shop });
  } catch (error) {
    next(error);
  }
};

// @desc    Extend trial by N days
// @route   PUT /api/shops/:id/extend-trial
exports.extendTrial = async (req, res, next) => {
  try {
    const { days } = req.body;
    if (!days || days < 1 || days > 365) {
      throw new AppError('Please provide a valid number of days (1-365)', 400);
    }

    const shop = await Shop.findById(req.params.id);

    if (!shop) {
      throw new AppError('Shop not found', 404);
    }

    // Calculate new trial end date
    const currentEnd = shop.subscription?.trialEndsAt || new Date();
    const newEnd = new Date(currentEnd);
    newEnd.setDate(newEnd.getDate() + days);

    shop.subscription.status = 'trial';
    shop.subscription.trialEndsAt = newEnd;
    await shop.save();

    await AuditLog.create({
      user: req.userId,
      action: 'extend_trial',
      resource: 'Shop',
      resourceId: shop._id,
      description: `Extended trial by ${days} days for shop: ${shop.name}. New trial end: ${newEnd.toISOString()}`,
      ip: req.ip,
    });

    res.json({ success: true, message: `Trial extended by ${days} days`, data: shop });
  } catch (error) {
    next(error);
  }
};

// @desc    Send subscription reminder email to shop admin
// @route   POST /api/shops/:id/send-subscription-reminder
exports.sendSubscriptionReminder = async (req, res, next) => {
  try {
    const shop = await Shop.findById(req.params.id).populate('subscription.plan', 'name monthlyPrice');

    if (!shop) {
      throw new AppError('Shop not found', 404);
    }

    const shopAdmin = await User.findOne({ shopId: shop._id, role: 'shop_admin' });
    if (!shopAdmin) {
      throw new AppError('Shop admin not found', 404);
    }

    // Initialize email transporter before sending
    const emailService = require('../services/emailService');
    emailService.initializeTransporter();

    const emailResult = await emailService.sendCompleteTrialEmail(
      shopAdmin.email,
      shopAdmin.name,
      shop.name,
      shop.subscription?.plan?.name || 'Premium',
      shop.subscription?.plan?.monthlyPrice || 0
    );

    if (!emailResult.success) {
      // Log the error details for debugging
      logger.error(`Email send failed for ${shopAdmin.email}: ${emailResult.error || emailResult.message}`);
      throw new AppError(`Failed to send reminder email. ${emailResult.message || 'Please try again.'}`, 500);
    }

    await AuditLog.create({
      user: req.userId,
      action: 'send_subscription_reminder',
      resource: 'Shop',
      resourceId: shop._id,
      description: `Sent subscription reminder email to shop admin: ${shopAdmin.email} for shop: ${shop.name}`,
      ip: req.ip,
    });

    res.json({
      success: true,
      message: 'Subscription reminder email sent successfully',
      data: { email: shopAdmin.email },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Send announcement/bulk email to all shop admins (Super Admin only)
// @route   POST /api/shops/send-announcement
exports.sendAnnouncement = async (req, res, next) => {
  try {
    const { subject, message: emailMessage, type } = req.body;

    if (!subject || !emailMessage) {
      throw new AppError('Subject and message are required', 400);
    }

    // Get all active shops with their admin users
    const activeShops = await Shop.find({ status: 'active' }).select('_id name');
    
    if (!activeShops.length) {
      throw new AppError('No active shops found', 404);
    }

    const shopIds = activeShops.map(s => s._id);
    const shopAdmins = await User.find({
      shopId: { $in: shopIds },
      role: 'shop_admin',
      isActive: true,
    }).select('email name shopId');

    if (!shopAdmins.length) {
      throw new AppError('No shop admins found to send email to', 404);
    }

    const emailService = require('../services/emailService');
    emailService.initializeTransporter();

    let sentCount = 0;
    let failCount = 0;
    const failedEmails = [];

    // Create notification for each shop
    const Notification = require('../models/Notification');
    const notifications = [];

    for (const admin of shopAdmins) {
      try {
        const shop = activeShops.find(s => String(s._id) === String(admin.shopId));
        const shopName = shop ? shop.name : 'Unknown Shop';

        const emailResult = await emailService.sendEmail(
          admin.email,
          subject,
          emailMessage
        );

        if (emailResult.success) {
          sentCount++;
          notifications.push({
            type: 'system_announcement',
            title: subject,
            message: emailMessage.substring(0, 200),
            channel: 'email',
            recipient: admin._id,
            shopId: admin.shopId,
            status: 'sent',
            sentAt: new Date(),
            createdBy: req.userId,
          });
        } else {
          failCount++;
          failedEmails.push(admin.email);
        }
      } catch (adminErr) {
        failCount++;
        failedEmails.push(admin.email);
        logger.warn(`Failed to send announcement to ${admin.email}: ${adminErr.message}`);
      }
    }

    // Save notifications in bulk
    if (notifications.length > 0) {
      await Notification.insertMany(notifications);
    }

    await AuditLog.create({
      user: req.userId,
      action: 'send_password_reset',
      resource: 'Shop',
      description: `Sent announcement "${subject}" to ${sentCount} shop admins (${failCount} failed)`,
      ip: req.ip,
    });

    res.json({
      success: true,
      message: `Announcement sent to ${sentCount} shop admin(s)${failCount > 0 ? `. ${failCount} failed.` : ''}`,
      data: { sentCount, failCount, failedEmails: failedEmails.slice(0, 10) },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get deleted/disabled shops for recycle bin (Super Admin only)
// @route   GET /api/shops/recycle-bin
exports.getRecycleBin = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const query = { status: 'disabled' };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { 'contact.email': { $regex: search, $options: 'i' } },
      ];
    }

    const shops = await Shop.find(query)
      .sort({ updatedAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Shop.countDocuments(query);

    res.json({
      success: true,
      data: shops,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Restore a deleted/disabled shop (Super Admin only)
// @route   PUT /api/shops/:id/restore
exports.restoreShop = async (req, res, next) => {
  try {
    const shop = await Shop.findById(req.params.id);

    if (!shop) {
      throw new AppError('Shop not found', 404);
    }

    if (shop.status !== 'disabled') {
      throw new AppError('Only disabled shops can be restored', 400);
    }

    shop.status = 'active';
    shop.updatedBy = req.userId;
    await shop.save();

    // Reactivate all users for this shop
    await User.updateMany({ shopId: shop._id }, { isActive: true });

    await AuditLog.create({
      user: req.userId,
      action: 'update',
      resource: 'Shop',
      resourceId: shop._id,
      description: `Restored shop from recycle bin: ${shop.name}`,
      ip: req.ip,
    });

    res.json({ success: true, message: 'Shop restored successfully', data: shop });
  } catch (error) {
    next(error);
  }
};

// @desc    Permanently delete a shop from recycle bin (Super Admin only)
// @route   DELETE /api/shops/:id/permanent-delete
exports.permanentDeleteShop = async (req, res, next) => {
  try {
    const shop = await Shop.findById(req.params.id);

    if (!shop) {
      throw new AppError('Shop not found', 404);
    }

    if (shop.status !== 'disabled') {
      throw new AppError('Only disabled shops can be permanently deleted', 400);
    }

    // Delete all associated data
    const Branch = require('../models/Branch');
    const Product = require('../models/Product');
    const Order = require('../models/Order');
    const Customer = require('../models/Customer');
    
    await Promise.all([
      User.deleteMany({ shopId: shop._id }),
      Branch.deleteMany({ shopId: shop._id }),
      Product.deleteMany({ shopId: shop._id }),
      Order.deleteMany({ shopId: shop._id }),
      Customer.deleteMany({ shopId: shop._id }),
    ]);

    await AuditLog.create({
      user: req.userId,
      action: 'delete',
      resource: 'Shop',
      resourceId: shop._id,
      description: `Permanently deleted shop: ${shop.name} from recycle bin`,
      ip: req.ip,
    });

    await Shop.findByIdAndDelete(shop._id);

    res.json({ success: true, message: 'Shop permanently deleted' });
  } catch (error) {
    next(error);
  }
};

module.exports = exports;
