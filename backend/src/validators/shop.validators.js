const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const {
  requiredString, optionalString, requiredEmail, optionalEmail,
  requiredPhone, optionalPhone, gstin, pan, pincode, colorHex,
  currency, timezone, dateFormat, language, requiredBoolean,
  optionalBoolean, optionalInt, requiredInt, optionalObject,
  requiredEnum, optionalEnum, optionalUrl, password,
} = require('./common.validators');

const BUSINESS_TYPES = [
  'medical_store', 'pharmacy', 'distributor', 'grocery_store',
  'supermarket', 'electronics_shop', 'mobile_shop', 'cosmetics_shop',
  'hardware_shop', 'riyansh_mlm', 'custom',
];
const SHOP_STATUSES = ['active', 'inactive', 'suspended', 'disabled'];
const SUB_STATUSES = ['active', 'trial', 'expired', 'suspended', 'cancelled'];

const registerShopValidator = [
  requiredString('shopName', { min: 2, max: 200 }),
  requiredEnum('businessType', BUSINESS_TYPES),
  optionalString('customBusinessType', { max: 100 }),
  gstin().optional({ values: 'null' }),
  pan().optional({ values: 'null' }),
  requiredString('address', { max: 500 }),
  optionalString('addressLine2', { max: 500 }),
  requiredString('city', { max: 100 }),
  requiredString('state', { max: 100 }),
  pincode('pincode').notEmpty().withMessage('Pincode is required'),
  requiredString('country', { max: 100 }),
  requiredPhone('phone'),
  requiredEmail('email'),
  optionalUrl('website'),
  requiredString('name', { min: 2, max: 100 }),
  password(),
  validate,
];

const createShopValidator = [
  requiredString('name', { min: 2, max: 200 }),
  requiredEnum('businessType', BUSINESS_TYPES),
  optionalString('customBusinessType', { max: 100 }),
  gstin().optional({ values: 'null' }),
  pan().optional({ values: 'null' }),
  optionalString('address', { max: 500 }),
  optionalString('addressLine2', { max: 500 }),
  optionalString('city', { max: 100 }),
  optionalString('state', { max: 100 }),
  pincode().optional({ values: 'null' }),
  optionalString('country', { max: 100 }),
  optionalPhone('phone'),
  optionalEmail('email'),
  optionalUrl('website'),
  requiredEmail('adminEmail'),
  optionalString('adminName', { max: 100 }),
  validate,
];

const updateShopValidator = [
  optionalString('name', { max: 200 }),
  optionalEnum('businessType', BUSINESS_TYPES),
  optionalString('customBusinessType', { max: 100 }),
  gstin().optional({ values: 'null' }),
  pan().optional({ values: 'null' }),
  optionalString('address', { max: 500 }),
  optionalString('addressLine2', { max: 500 }),
  optionalString('city', { max: 100 }),
  optionalString('state', { max: 100 }),
  pincode().optional({ values: 'null' }),
  optionalString('country', { max: 100 }),
  optionalPhone('phone'),
  optionalEmail('email'),
  optionalUrl('website'),
  optionalString('logo', { max: 500 }),
  optionalObject('branding'),
  optionalObject('features'),
  optionalObject('limits'),
  optionalString('status', { max: 20 }),
  validate,
];

const extendTrialValidator = [
  body('days')
    .optional({ values: 'null' })
    .isInt({ min: 1, max: 90 }).withMessage('Days must be an integer between 1 and 90')
    .toInt(),
  validate,
];

const closeTrialValidator = [validate];

const sendAnnouncementValidator = [
  requiredString('subject', { min: 1, max: 200 }),
  requiredString('message', { min: 1, max: 10000 }),
  optionalEnum('type', ['general', 'offer', 'reminder', 'update']),
  validate,
];

module.exports = {
  registerShopValidator,
  createShopValidator,
  updateShopValidator,
  extendTrialValidator,
  closeTrialValidator,
  sendAnnouncementValidator,
};
