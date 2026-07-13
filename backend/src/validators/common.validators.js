const { body, param } = require('express-validator');

// ─── Reusable field validation chains ───

/** A valid MongoDB ObjectId */
const mongoId = (field = 'id') =>
  param(field)
    .isMongoId()
    .withMessage(`Invalid ${field}: must be a valid MongoDB ObjectId`);

/** Required string with min/max length */
const requiredString = (field, { min = 1, max = 500 } = {}) =>
  body(field)
    .trim()
    .notEmpty()
    .withMessage(`${field} is required`)
    .isString()
    .withMessage(`${field} must be a string`)
    .isLength({ min, max })
    .withMessage(`${field} must be between ${min} and ${max} characters`);

/** Optional string with max length */
const optionalString = (field, { max = 500 } = {}) =>
  body(field)
    .optional({ values: 'null' })
    .trim()
    .isString()
    .withMessage(`${field} must be a string`)
    .isLength({ max })
    .withMessage(`${field} must be at most ${max} characters`);

/** Required email */
const requiredEmail = (field = 'email') =>
  body(field)
    .trim()
    .notEmpty()
    .withMessage(`${field} is required`)
    .isEmail()
    .withMessage(`Please provide a valid ${field}`)
    .normalizeEmail()
    .isLength({ max: 254 })
    .withMessage(`${field} must be at most 254 characters`);

/** Optional email */
const optionalEmail = (field = 'email') =>
  body(field)
    .optional({ values: 'null' })
    .trim()
    .isEmail()
    .withMessage(`Please provide a valid ${field}`)
    .normalizeEmail()
    .isLength({ max: 254 })
    .withMessage(`${field} must be at most 254 characters`);

/** Required phone (Indian/international) */
const requiredPhone = (field = 'phone') =>
  body(field)
    .trim()
    .notEmpty()
    .withMessage(`${field} is required`)
    .matches(/^\+?[\d\s\-()]{7,20}$/)
    .withMessage(`Please provide a valid ${field} number`);

/** Optional phone */
const optionalPhone = (field = 'phone') =>
  body(field)
    .optional({ values: 'null' })
    .trim()
    .matches(/^\+?[\d\s\-()]{7,20}$/)
    .withMessage(`Please provide a valid ${field} number`);

/** Required URL */
const requiredUrl = (field = 'url') =>
  body(field)
    .trim()
    .notEmpty()
    .withMessage(`${field} is required`)
    .isURL()
    .withMessage(`Please provide a valid ${field}`);

/** Optional URL */
const optionalUrl = (field = 'url') =>
  body(field)
    .optional({ values: 'null' })
    .trim()
    .isURL()
    .withMessage(`Please provide a valid ${field}`);

/** Required boolean */
const requiredBoolean = (field) =>
  body(field)
    .notEmpty()
    .withMessage(`${field} is required`)
    .isBoolean()
    .withMessage(`${field} must be a boolean`);

/** Optional boolean */
const optionalBoolean = (field) =>
  body(field)
    .optional({ values: 'null' })
    .isBoolean()
    .withMessage(`${field} must be a boolean`);

/** Required number (float) */
const requiredNumber = (field, { min, max } = {}) => {
  let chain = body(field)
    .notEmpty()
    .withMessage(`${field} is required`)
    .isFloat()
    .withMessage(`${field} must be a number`);
  if (min !== undefined) chain = chain.isFloat({ min }).withMessage(`${field} must be at least ${min}`);
  if (max !== undefined) chain = chain.isFloat({ max }).withMessage(`${field} must be at most ${max}`);
  return chain;
};

/** Optional number (float) */
const optionalNumber = (field, { min, max } = {}) => {
  let chain = body(field)
    .optional({ values: 'null' })
    .isFloat()
    .withMessage(`${field} must be a number`);
  if (min !== undefined) chain = chain.isFloat({ min }).withMessage(`${field} must be at least ${min}`);
  if (max !== undefined) chain = chain.isFloat({ max }).withMessage(`${field} must be at most ${max}`);
  return chain;
};

/** Required integer */
const requiredInt = (field, { min, max } = {}) => {
  let chain = body(field)
    .notEmpty()
    .withMessage(`${field} is required`)
    .isInt()
    .withMessage(`${field} must be an integer`);
  if (min !== undefined) chain = chain.isInt({ min }).withMessage(`${field} must be at least ${min}`);
  if (max !== undefined) chain = chain.isInt({ max }).withMessage(`${field} must be at most ${max}`);
  return chain;
};

/** Optional integer */
const optionalInt = (field, { min, max } = {}) => {
  let chain = body(field)
    .optional({ values: 'null' })
    .isInt()
    .withMessage(`${field} must be an integer`);
  if (min !== undefined) chain = chain.isInt({ min }).withMessage(`${field} must be at least ${min}`);
  if (max !== undefined) chain = chain.isInt({ max }).withMessage(`${field} must be at most ${max}`);
  return chain;
};

/** Required enum */
const requiredEnum = (field, values) =>
  body(field)
    .trim()
    .notEmpty()
    .withMessage(`${field} is required`)
    .isIn(values)
    .withMessage(`${field} must be one of: ${values.join(', ')}`);

/** Optional enum */
const optionalEnum = (field, values) =>
  body(field)
    .optional({ values: 'null' })
    .trim()
    .isIn(values)
    .withMessage(`${field} must be one of: ${values.join(', ')}`);

/** Required ISO date */
const requiredDate = (field) =>
  body(field)
    .notEmpty()
    .withMessage(`${field} is required`)
    .isISO8601()
    .withMessage(`${field} must be a valid ISO 8601 date`);

/** Optional ISO date */
const optionalDate = (field) =>
  body(field)
    .optional({ values: 'null' })
    .isISO8601()
    .withMessage(`${field} must be a valid ISO 8601 date`);

/** Required object (plain object, not array) */
const requiredObject = (field) =>
  body(field)
    .notEmpty()
    .withMessage(`${field} is required`)
    .isObject()
    .withMessage(`${field} must be an object`);

/** Optional object */
const optionalObject = (field) =>
  body(field)
    .optional({ values: 'null' })
    .isObject()
    .withMessage(`${field} must be an object`);

/** Required array */
const requiredArray = (field, { minLen, maxLen } = {}) => {
  let chain = body(field)
    .notEmpty()
    .withMessage(`${field} is required`)
    .isArray()
    .withMessage(`${field} must be an array`);
  if (minLen !== undefined) chain = chain.isArray({ min: minLen }).withMessage(`${field} must have at least ${minLen} item(s)`);
  if (maxLen !== undefined) chain = chain.isArray({ max: maxLen }).withMessage(`${field} must have at most ${maxLen} item(s)`);
  return chain;
};

/** Optional array */
const optionalArray = (field, { minLen, maxLen } = {}) => {
  let chain = body(field)
    .optional({ values: 'null' })
    .isArray()
    .withMessage(`${field} must be an array`);
  if (minLen !== undefined) chain = chain.isArray({ min: minLen });
  if (maxLen !== undefined) chain = chain.isArray({ max: maxLen });
  return chain;
};

/** GSTIN format (Indian) */
const gstin = (field = 'gstin') =>
  body(field)
    .optional({ values: 'null' })
    .trim()
    .matches(/^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}[Z]{1}[A-Z\d]{1}$/)
    .withMessage('Invalid GSTIN format');

/** PAN format (Indian) */
const pan = (field = 'pan') =>
  body(field)
    .optional({ values: 'null' })
    .trim()
    .matches(/^[A-Z]{5}\d{4}[A-Z]{1}$/)
    .withMessage('Invalid PAN format');

/** Pincode (Indian) */
const pincode = (field = 'pincode') =>
  body(field)
    .optional({ values: 'null' })
    .trim()
    .matches(/^\d{6}$/)
    .withMessage('Pincode must be a 6-digit number');

/** Password with strength requirements */
const password = (field = 'password') =>
  body(field)
    .notEmpty()
    .withMessage('Password is required')
    .isString()
    .withMessage('Password must be a string')
    .isLength({ min: 6, max: 128 })
    .withMessage('Password must be between 6 and 128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain uppercase, lowercase, and a number');

/** Required MongoDB ObjectId (from request body) */
const requiredMongoId = (field) =>
  body(field)
    .trim()
    .notEmpty()
    .withMessage(`${field} is required`)
    .isMongoId()
    .withMessage(`${field} must be a valid MongoDB ObjectId`);

/** Optional MongoDB ObjectId (from request body) */
const optionalMongoId = (field) =>
  body(field)
    .optional({ values: 'null' })
    .trim()
    .isMongoId()
    .withMessage(`${field} must be a valid MongoDB ObjectId`);

/** Color hex code */
const colorHex = (field) =>
  body(field)
    .optional({ values: 'null' })
    .trim()
    .matches(/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/)
    .withMessage(`${field} must be a valid hex color (e.g. #2563eb)`);

/** Currency code */
const currency = (field = 'currency') =>
  body(field)
    .optional({ values: 'null' })
    .trim()
    .isIn(['INR', 'USD', 'EUR', 'GBP', 'AUD', 'CAD', 'JPY', 'CNY', 'SGD', 'AED'])
    .withMessage('Invalid currency code');

/** Timezone */
const timezone = (field = 'timezone') =>
  body(field)
    .optional({ values: 'null' })
    .trim()
    .isLength({ max: 50 })
    .withMessage('Timezone must be at most 50 characters');

/** Date format */
const dateFormat = (field = 'dateFormat') =>
  body(field)
    .optional({ values: 'null' })
    .trim()
    .isIn(['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'])
    .withMessage('Date format must be DD/MM/YYYY, MM/DD/YYYY, or YYYY-MM-DD');

/** Language code */
const language = (field = 'language') =>
  body(field)
    .optional({ values: 'null' })
    .trim()
    .isIn(['en', 'hi', 'mr', 'gu', 'ta', 'te', 'kn', 'bn'])
    .withMessage('Language must be one of: en, hi, mr, gu, ta, te, kn, bn');

module.exports = {
  mongoId,
  requiredMongoId,
  optionalMongoId,
  requiredString,
  optionalString,
  requiredEmail,
  optionalEmail,
  requiredPhone,
  optionalPhone,
  requiredUrl,
  optionalUrl,
  requiredBoolean,
  optionalBoolean,
  requiredNumber,
  optionalNumber,
  requiredInt,
  optionalInt,
  requiredEnum,
  optionalEnum,
  requiredDate,
  optionalDate,
  requiredObject,
  optionalObject,
  requiredArray,
  optionalArray,
  gstin,
  pan,
  pincode,
  password,
  colorHex,
  currency,
  timezone,
  dateFormat,
  language,
};
