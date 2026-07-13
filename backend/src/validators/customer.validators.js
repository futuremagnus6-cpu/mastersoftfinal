const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const {
  requiredString, optionalString, requiredEmail, optionalEmail,
  requiredPhone, optionalPhone, requiredNumber, optionalNumber,
  requiredInt, optionalInt, requiredDate, optionalDate,
  gstin, pan, pincode, requiredEnum, optionalEnum, requiredMongoId,
  optionalObject, optionalBoolean,
} = require('./common.validators');

// ─── Customer ───

const createCustomerValidator = [
  requiredString('name', { min: 1, max: 200 }),
  optionalEmail('email'),
  optionalPhone('phone'),
  optionalString('gstin', { max: 20 }),
  optionalString('pan', { max: 20 }),
  optionalString('address', { max: 500 }),
  optionalString('city', { max: 100 }),
  optionalString('state', { max: 100 }),
  pincode().optional({ values: 'null' }),
  optionalNumber('creditLimit', { min: 0 }),
  optionalString('notes', { max: 1000 }),
  optionalDate('dateOfBirth'),
  optionalString('anniversary', { max: 20 }),
  optionalEnum('gender', ['male', 'female', 'other']),
  validate,
];

const updateCustomerValidator = [
  optionalString('name', { max: 200 }),
  optionalEmail('email'),
  optionalPhone('phone'),
  optionalString('gstin', { max: 20 }),
  optionalString('pan', { max: 20 }),
  optionalString('address', { max: 500 }),
  optionalString('city', { max: 100 }),
  optionalString('state', { max: 100 }),
  pincode().optional({ values: 'null' }),
  optionalNumber('creditLimit', { min: 0 }),
  optionalString('notes', { max: 1000 }),
  optionalDate('dateOfBirth'),
  optionalString('anniversary', { max: 20 }),
  optionalEnum('gender', ['male', 'female', 'other']),
  validate,
];

// ─── Customer Loyalty ───

const addLoyaltyPointsValidator = [
  requiredInt('points', { min: 1, max: 1000000 }),
  optionalString('reason', { max: 500 }),
  validate,
];

const redeemLoyaltyPointsValidator = [
  requiredInt('points', { min: 1, max: 1000000 }),
  optionalString('reason', { max: 500 }),
  validate,
];

const recordCreditPaymentValidator = [
  requiredNumber('amount', { min: 0.01 }),
  optionalString('reference', { max: 100 }),
  optionalString('notes', { max: 500 }),
  optionalDate('paymentDate'),
  validate,
];

// ─── CRM ───

const addCustomerNoteValidator = [
  requiredString('content', { min: 1, max: 5000 }),
  optionalString('type', { max: 50 }),
  validate,
];

// ─── Loyalty Tier ───

const createTierValidator = [
  requiredString('name', { min: 1, max: 100 }),
  optionalString('description', { max: 500 }),
  requiredInt('minPoints', { min: 0 }),
  optionalNumber('multiplier', { min: 0.5, max: 10 }),
  optionalString('color', { max: 20 }),
  optionalObject('benefits'),
  validate,
];

const updateTierValidator = [
  optionalString('name', { max: 100 }),
  optionalString('description', { max: 500 }),
  optionalInt('minPoints', { min: 0 }),
  optionalNumber('multiplier', { min: 0.5, max: 10 }),
  optionalString('color', { max: 20 }),
  optionalObject('benefits'),
  validate,
];

// ─── Loyalty Transaction ───

const createLoyaltyTransactionValidator = [
  requiredEnum('type', ['earn', 'redeem', 'adjust', 'expire']),
  requiredInt('points', { min: 1 }),
  requiredMongoId('customerId'),
  optionalString('orderId', { max: 50 }),
  optionalString('reference', { max: 200 }),
  optionalString('notes', { max: 500 }),
  validate,
];

// ─── Loyalty Settings ───

const updateLoyaltySettingsValidator = [
  optionalInt('pointsPerRupee', { min: 0 }),
  optionalInt('minRedeemPoints', { min: 0 }),
  optionalInt('maxRedeemPercent', { min: 0, max: 100 }),
  optionalInt('expiryMonths', { min: 0 }),
  optionalBoolean('autoEarn'),
  validate,
];

module.exports = {
  createCustomerValidator,
  updateCustomerValidator,
  addLoyaltyPointsValidator,
  redeemLoyaltyPointsValidator,
  recordCreditPaymentValidator,
  addCustomerNoteValidator,
  createTierValidator,
  updateTierValidator,
  createLoyaltyTransactionValidator,
  updateLoyaltySettingsValidator,
};
