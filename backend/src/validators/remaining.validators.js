const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const {
  requiredString, optionalString, requiredEmail, optionalEmail,
  requiredPhone, optionalPhone, requiredUrl, optionalUrl,
  requiredNumber, optionalNumber, requiredInt, optionalInt,
  requiredBoolean, optionalBoolean, requiredEnum, optionalEnum,
  requiredArray, optionalArray, requiredObject, optionalObject,
  currency, timezone, dateFormat, language,
} = require('./common.validators');

// ─── Ecommerce ───

const createOnlineOrderValidator = [
  requiredArray('items', { minLen: 1 }),
  body('items.*.productId')
    .notEmpty().withMessage('Product ID is required')
    .isMongoId().withMessage('Product ID must be a valid ObjectId'),
  body('items.*.quantity')
    .isInt({ min: 1 }).withMessage('Quantity must be a positive integer')
    .toInt(),
  optionalString('shippingAddress', { max: 500 }),
  optionalString('city', { max: 100 }),
  optionalString('state', { max: 100 }),
  optionalString('pincode', { max: 10 }),
  optionalString('customerName', { max: 200 }),
  optionalPhone('customerPhone'),
  optionalEmail('customerEmail'),
  optionalString('notes', { max: 1000 }),
  validate,
];

const checkPincodeValidator = [validate];

// ─── Webhook ───

const createWebhookValidator = [
  requiredUrl('url'),
  requiredString('name', { min: 1, max: 200 }),
  optionalArray('events'),
  body('events.*')
    .optional({ values: 'null' })
    .isString().trim().isLength({ max: 100 }).withMessage('Each event must be a string of max 100 characters'),
  optionalBoolean('isActive'),
  validate,
];

const updateWebhookValidator = [
  optionalUrl('url'),
  optionalString('name', { max: 200 }),
  optionalArray('events'),
  body('events.*')
    .optional({ values: 'null' })
    .isString().trim().isLength({ max: 100 }),
  optionalBoolean('isActive'),
  validate,
];

// ─── API Key ───

const createApiKeyValidator = [
  requiredString('name', { min: 1, max: 100 }),
  optionalArray('permissions'),
  optionalEnum('status', ['active', 'inactive']),
  validate,
];

const updateApiKeyValidator = [
  optionalString('name', { max: 100 }),
  optionalArray('permissions'),
  optionalEnum('status', ['active', 'inactive']),
  validate,
];

// ─── Backup ───

const createBackupValidator = [
  optionalString('notes', { max: 500 }),
  validate,
];

// ─── Referral ───

const createReferralValidator = [
  requiredString('name', { min: 1, max: 200 }),
  requiredEmail('email'),
  optionalPhone('phone'),
  optionalString('notes', { max: 500 }),
  validate,
];

const updateReferralValidator = [
  optionalString('name', { max: 200 }),
  optionalEmail('email'),
  optionalPhone('phone'),
  optionalString('notes', { max: 500 }),
  validate,
];

// ─── WhatsApp ───

const sendWhatsAppValidator = [
  requiredString('to', { min: 10, max: 20 }),
  requiredString('message', { min: 1, max: 4096 }),
  optionalString('templateName', { max: 100 }),
  validate,
];

const verifyWhatsAppValidator = [
  requiredPhone('phone'),
  validate,
];

// ─── Contact / Enquiry ───

const submitEnquiryValidator = [
  requiredString('name', { min: 1, max: 200 }),
  requiredEmail('email'),
  requiredPhone('phone'),
  requiredString('subject', { min: 1, max: 200 }),
  requiredString('message', { min: 1, max: 5000 }),
  optionalString('shopName', { max: 200 }),
  optionalString('businessType', { max: 100 }),
  validate,
];

const updateEnquiryValidator = [
  optionalEnum('status', ['new', 'read', 'replied', 'closed']),
  optionalString('notes', { max: 2000 }),
  validate,
];

// ─── Settings (shop) ───

const updateShopSettingsValidator = [
  optionalString('shopName', { max: 200 }),
  optionalString('businessType', { max: 100 }),
  optionalString('gstin', { max: 20 }),
  optionalString('pan', { max: 20 }),
  optionalString('phone', { max: 20 }),
  optionalEmail('email'),
  optionalUrl('website'),
  optionalString('address', { max: 500 }),
  optionalString('addressLine2', { max: 500 }),
  optionalString('city', { max: 100 }),
  optionalString('state', { max: 100 }),
  optionalString('pincode', { max: 10 }),
  optionalString('country', { max: 100 }),
  optionalString('logo', { max: 500 }),
  currency(),
  timezone(),
  dateFormat(),
  language(),
  optionalEnum('taxMode', ['inclusive', 'exclusive']),
  optionalBoolean('compositionScheme'),
  optionalBoolean('offlinePos'),
  optionalBoolean('darkMode'),
  optionalBoolean('autoBackup'),
  optionalObject('branding'),
  optionalObject('features'),
  optionalObject('limits'),
  optionalObject('settings'),
  validate,
];

// ─── Platform Config ───

const updatePlatformConfigValidator = [
  optionalString('platformName', { max: 200 }),
  optionalEmail('supportEmail'),
  optionalString('supportPhone', { max: 20 }),
  currency('defaultCurrency'),
  timezone(),
  dateFormat(),
  optionalBoolean('allowRegistration'),
  optionalInt('defaultTrialDays', { min: 0, max: 365 }),
  optionalInt('maxShopsPerAdmin', { min: 1 }),
  optionalInt('sessionTimeout', { min: 0, max: 1440 }),
  optionalInt('passwordMinLength', { min: 4, max: 128 }),
  optionalBoolean('twoFactorRequired'),
  optionalInt('rateLimitPerMinute', { min: 1, max: 10000 }),
  optionalInt('authRateLimitIpMax', { min: 1 }),
  optionalInt('authRateLimitIpWindow', { min: 1, max: 1440 }),
  optionalInt('authRateLimitAccountBaseMax', { min: 1 }),
  optionalNumber('authRateLimitAccountBackoffFactor', { min: 1, max: 10 }),
  optionalInt('authRateLimitAccountWindow', { min: 1, max: 1440 }),
  optionalInt('publicRateLimitMax', { min: 1 }),
  optionalInt('publicRateLimitWindow', { min: 1, max: 1440 }),
  optionalInt('apiRateLimitMax', { min: 1 }),
  optionalInt('apiRateLimitWindow', { min: 1, max: 1440 }),
  optionalInt('webhookRetryCount', { min: 0, max: 10 }),
  optionalBoolean('maintenanceMode'),
  optionalBoolean('backupEnabled'),
  optionalString('backupTime', { max: 5 }),
  optionalInt('retentionDays', { min: 1, max: 365 }),
  validate,
];

// ─── Notification ───

const markNotifReadValidator = [validate];
const markAllNotifReadValidator = [validate];

// ─── Alert ───

const updateAlertValidator = [
  optionalObject('thresholds'),
  optionalBoolean('enabled'),
  optionalString('channels', { max: 200 }),
  validate,
];

const toggleAlertValidator = [validate];

module.exports = {
  // Ecommerce
  createOnlineOrderValidator,
  checkPincodeValidator,
  // Webhook
  createWebhookValidator,
  updateWebhookValidator,
  // API Key
  createApiKeyValidator,
  updateApiKeyValidator,
  // Backup
  createBackupValidator,
  // Referral
  createReferralValidator,
  updateReferralValidator,
  // WhatsApp
  sendWhatsAppValidator,
  verifyWhatsAppValidator,
  // Contact
  submitEnquiryValidator,
  updateEnquiryValidator,
  // Settings
  updateShopSettingsValidator,
  // Platform Config
  updatePlatformConfigValidator,
  // Notification
  markNotifReadValidator,
  markAllNotifReadValidator,
  // Alert
  updateAlertValidator,
  toggleAlertValidator,
};
