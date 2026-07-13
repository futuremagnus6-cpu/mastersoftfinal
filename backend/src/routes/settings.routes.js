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
      .select('name businessType gstin pan address contact logo branding settings features limits');

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
      branding: shop.branding || {},
      currency: shop.settings?.currency || 'INR',
      timezone: shop.settings?.timezone || 'Asia/Kolkata',
      dateFormat: shop.settings?.dateFormat || 'DD/MM/YYYY',
      language: shop.settings?.language || 'en',
      taxMode: shop.settings?.taxInclusive ? 'inclusive' : 'exclusive',
      compositionScheme: shop.settings?.compositionScheme || false,
      offlinePos: shop.settings?.offlinePos || false,
      darkMode: shop.settings?.darkMode || false,
      autoBackup: shop.settings?.autoBackup || false,
      features: shop.features || {},
      limits: shop.limits || {},
      // Pass the raw settings too for any advanced use
      settings: shop.settings || {},
    };

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
    if (body.phone !== undefined) shop.contact.phone = body.phone;
    if (body.email !== undefined) shop.contact.email = body.email;
    if (body.website !== undefined) shop.contact.website = body.website;

    // Address fields
    if (body.address !== undefined) shop.address.line1 = body.address;
    if (body.addressLine2 !== undefined) shop.address.line2 = body.addressLine2;
    if (body.city !== undefined) shop.address.city = body.city;
    if (body.state !== undefined) shop.address.state = body.state;
    if (body.pincode !== undefined) shop.address.pincode = body.pincode;
    if (body.country !== undefined) shop.address.country = body.country;

    // Settings fields
    if (body.currency !== undefined) shop.settings.currency = body.currency;
    if (body.timezone !== undefined) shop.settings.timezone = body.timezone;
    if (body.dateFormat !== undefined) shop.settings.dateFormat = body.dateFormat;
    if (body.language !== undefined) shop.settings.language = body.language;
    if (body.taxMode !== undefined) shop.settings.taxInclusive = body.taxMode === 'inclusive';
    if (body.compositionScheme !== undefined) shop.settings.compositionScheme = body.compositionScheme;
    if (body.offlinePos !== undefined) shop.settings.offlinePos = body.offlinePos;
    if (body.darkMode !== undefined) shop.settings.darkMode = body.darkMode;
    if (body.autoBackup !== undefined) shop.settings.autoBackup = body.autoBackup;

    // Branding (nested object — merge)
    if (body.branding && typeof body.branding === 'object') {
      Object.assign(shop.branding, body.branding);
    }

    // Features (nested object — merge)
    if (body.features && typeof body.features === 'object') {
      Object.assign(shop.features, body.features);
    }

    // Limits (nested object — merge, super admin only)
    if (body.limits && typeof body.limits === 'object') {
      Object.assign(shop.limits, body.limits);
    }

    // Full settings object override (for advanced use)
    if (body.settings && typeof body.settings === 'object') {
      Object.entries(body.settings).forEach(([key, value]) => {
        if (shop.settings[key] !== undefined) {
          shop.settings[key] = value;
        }
      });
    }

    shop.updatedBy = req.userId;
    await shop.save();

    res.json({ success: true, message: 'Settings updated', data: shop });
  } catch (error) { next(error); }
});

module.exports = router;
