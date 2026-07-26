const express = require('express');
const router = express.Router();
const Shop = require('../models/Shop');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const { multiTenant } = require('../middleware/multiTenant');
const { AppError } = require('../middleware/errorHandler');
const { updateShopSettingsValidator } = require('../validators/remaining.validators');

router.use(authenticate);
router.use(multiTenant);

// Get shop settings
// The Shop model doesn't have a shopId field — it IS the shop itself.
// We query by _id using req.shopId (the current user's shop).
router.get('/', async (req, res, next) => {
  try {
    if (!req.shopId) throw new AppError('No shop context', 403);

    const shop = await Shop.findById(req.shopId)
      .select('name businessType gstin pan address contact logo branding settings features limits printConfig');

    if (!shop) throw new AppError('Shop not found', 404);

    // Map nested Shop fields to the flat structure the frontend expects
    const data = {
      _id: shop._id,
      shopName: shop.name || '',
      businessType: shop.businessType || '',
      gstin: shop.gstin || '',
      pan: shop.pan || '',
      phone: shop.contact?.phone || '',
      email: shop.contact?.email || '',
      website: shop.contact?.website || '',
      address: shop.address?.line1 || '',
      addressLine2: shop.address?.line2 || '',
      city: shop.address?.city || '',
      state: shop.address?.state || '',
      pincode: shop.address?.pincode || '',
      country: shop.address?.country || 'India',
      logo: shop.logo || '',
      branding: shop.branding || {
        googleBusinessProfile: {
          enabled: false,
          businessName: '',
          category: '',
          description: '',
          googleMapsUrl: '',
          googleBusinessUrl: '',
          phone: '',
          website: '',
          businessHours: '',
          serviceArea: '',
          verified: false,
          plusCode: '',
          placeId: '',
          attributes: '',
        },
      },
      currency: shop.settings?.currency || 'INR',
      timezone: shop.settings?.timezone || 'Asia/Kolkata',
      dateFormat: shop.settings?.dateFormat || 'DD/MM/YYYY',
      language: shop.settings?.language || 'en',
      taxMode: shop.settings?.taxInclusive ? 'inclusive' : 'exclusive',
      compositionScheme: shop.settings?.compositionScheme || false,
      offlinePos: shop.settings?.offlinePos || false,
      darkMode: shop.settings?.darkMode || false,
      autoBackup: shop.settings?.autoBackup || false,
      defaultDiscount: shop.settings?.defaultDiscount ?? 0,
      invoicePrefix: shop.settings?.invoicePrefix || 'INV-',
      orderPrefix: shop.settings?.orderPrefix || 'ORD-',
      invoiceTerms: shop.settings?.invoiceTerms || '',
      payment: shop.settings?.payment || {},
      customer: shop.settings?.customer || {},
      inventory: shop.settings?.inventory || {},
      pos: shop.settings?.pos || {},
      communication: shop.settings?.communication || {},
      features: shop.features || {},
      limits: shop.limits || {},
      alertConfig: shop.settings?.alertConfig || {
        lowStockThreshold: 10,
        expiryWarningDays: 30,
        dailySalesReport: true,
        weeklyReport: true,
        monthlyReport: false,
        paymentReminders: false,
        backupReminders: true,
      },
      backupRetentionDays: shop.settings?.backupRetentionDays ?? 30,
      // Pass the raw settings too for any advanced use
      settings: shop.settings || {},
    };

    // Include printConfig in the response
    if (shop.printConfig) {
      data.printConfig = shop.printConfig;
    }

    res.json({ success: true, data });
  } catch (error) { next(error); }
});

// Update shop settings
router.put('/', authorize('shop_admin'), updateShopSettingsValidator, async (req, res, next) => {
  try {
    if (!req.shopId) throw new AppError('No shop context', 403);

    const shop = await Shop.findById(req.shopId);
    if (!shop) throw new AppError('Shop not found', 404);

    const body = req.body;

    // Map flat frontend fields back to the nested Shop model
    if (body.shopName !== undefined) shop.name = body.shopName;
    if (body.businessType !== undefined) shop.businessType = body.businessType;
    if (body.gstin !== undefined) shop.gstin = body.gstin;
    if (body.pan !== undefined) shop.pan = body.pan;
    if (body.logo !== undefined) shop.logo = body.logo;

    // Contact fields
    if (!shop.contact) shop.contact = {};
    if (body.phone !== undefined) shop.contact.phone = body.phone;
    if (body.email !== undefined) shop.contact.email = body.email;
    if (body.website !== undefined) shop.contact.website = body.website;

    // Address fields
    if (!shop.address) shop.address = {};
    if (body.address !== undefined) shop.address.line1 = body.address;
    if (body.addressLine2 !== undefined) shop.address.line2 = body.addressLine2;
    if (body.city !== undefined) shop.address.city = body.city;
    if (body.state !== undefined) shop.address.state = body.state;
    if (body.pincode !== undefined) shop.address.pincode = body.pincode;
    if (body.country !== undefined) shop.address.country = body.country;

    // Settings fields
    if (!shop.settings) shop.settings = {};
    if (body.currency !== undefined) shop.settings.currency = body.currency;
    if (body.timezone !== undefined) shop.settings.timezone = body.timezone;
    if (body.dateFormat !== undefined) shop.settings.dateFormat = body.dateFormat;
    if (body.language !== undefined) shop.settings.language = body.language;
    if (body.taxMode !== undefined) shop.settings.taxInclusive = body.taxMode === 'inclusive';
    if (body.defaultDiscount !== undefined) shop.settings.defaultDiscount = Number(body.defaultDiscount);
    if (body.compositionScheme !== undefined) shop.settings.compositionScheme = body.compositionScheme;
    if (body.offlinePos !== undefined) shop.settings.offlinePos = body.offlinePos;
    if (body.darkMode !== undefined) shop.settings.darkMode = body.darkMode;
    if (body.autoBackup !== undefined) shop.settings.autoBackup = body.autoBackup;
    if (body.lang !== undefined) shop.settings.language = body.lang;
    if (body.backupRetentionDays !== undefined) shop.settings.backupRetentionDays = Number(body.backupRetentionDays);
    if (body.invoicePrefix !== undefined) shop.settings.invoicePrefix = body.invoicePrefix;
    if (body.orderPrefix !== undefined) shop.settings.orderPrefix = body.orderPrefix;
    if (body.invoiceTerms !== undefined) shop.settings.invoiceTerms = body.invoiceTerms;

    // Payment config
    if (body.payment && typeof body.payment === 'object') {
      if (!shop.settings.payment) shop.settings.payment = {};
      Object.assign(shop.settings.payment, body.payment);
      shop.markModified('settings');
    }

    // Customer settings
    if (body.customer && typeof body.customer === 'object') {
      if (!shop.settings.customer) shop.settings.customer = {};
      Object.assign(shop.settings.customer, body.customer);
      shop.markModified('settings');
    }

    // Inventory settings
    if (body.inventory && typeof body.inventory === 'object') {
      if (!shop.settings.inventory) shop.settings.inventory = {};
      Object.assign(shop.settings.inventory, body.inventory);
      shop.markModified('settings');
    }

    // POS settings
    if (body.pos && typeof body.pos === 'object') {
      if (!shop.settings.pos) shop.settings.pos = {};
      Object.assign(shop.settings.pos, body.pos);
      shop.markModified('settings');
    }

    // Communication settings
    if (body.communication && typeof body.communication === 'object') {
      if (!shop.settings.communication) shop.settings.communication = {};
      Object.assign(shop.settings.communication, body.communication);
      shop.markModified('settings');
    }

    // Branding (nested object — merge)
    if (body.branding && typeof body.branding === 'object') {
      if (!shop.branding) shop.branding = {};
      Object.assign(shop.branding, body.branding);
      shop.markModified('branding');
    }

    // Features (nested object — merge)
    if (body.features && typeof body.features === 'object') {
      if (!shop.features) shop.features = {};
      Object.assign(shop.features, body.features);
      shop.markModified('features');
    }

    // Alert Config (nested in shop.settings)
    if (body.alertConfig && typeof body.alertConfig === 'object') {
      if (!shop.settings.alertConfig) shop.settings.alertConfig = {};
      Object.assign(shop.settings.alertConfig, body.alertConfig);
      shop.markModified('settings');
    }

    // Limits (nested object — merge, super admin only)
    if (body.limits && typeof body.limits === 'object') {
      if (!shop.limits) shop.limits = {};
      Object.assign(shop.limits, body.limits);
    }

    // Full settings object override (for advanced use)
    if (body.settings && typeof body.settings === 'object') {
      Object.entries(body.settings).forEach(([key, value]) => {
        if (shop.settings[key] !== undefined) {
          shop.settings[key] = value;
        }
      });
      shop.markModified('settings');
    }

    // Print config (deep merge)
    if (body.printConfig && typeof body.printConfig === 'object') {
      if (!shop.printConfig) shop.printConfig = {};
      if (body.printConfig.thermal && typeof body.printConfig.thermal === 'object') {
        if (!shop.printConfig.thermal) shop.printConfig.thermal = {};
        Object.assign(shop.printConfig.thermal, body.printConfig.thermal);
      }
      if (body.printConfig.standard && typeof body.printConfig.standard === 'object') {
        if (!shop.printConfig.standard) shop.printConfig.standard = {};
        Object.assign(shop.printConfig.standard, body.printConfig.standard);
        // Handle nested productColumns
        if (body.printConfig.standard.productColumns && typeof body.printConfig.standard.productColumns === 'object') {
          if (!shop.printConfig.standard.productColumns) shop.printConfig.standard.productColumns = {};
          Object.assign(shop.printConfig.standard.productColumns, body.printConfig.standard.productColumns);
        }
      }
      if (body.printConfig.pdf && typeof body.printConfig.pdf === 'object') {
        if (!shop.printConfig.pdf) shop.printConfig.pdf = {};
        Object.assign(shop.printConfig.pdf, body.printConfig.pdf);
      }
      shop.markModified('printConfig');
    }

    shop.updatedBy = req.userId;
    await shop.save();

    res.json({ success: true, message: 'Settings updated', data: shop });
  } catch (error) { next(error); }
});

module.exports = router;
