const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const {
  requiredString, optionalString, requiredNumber, optionalNumber,
  requiredInt, optionalInt, requiredBoolean, optionalBoolean,
  optionalEnum, optionalObject,
} = require('./common.validators');

const createPlanValidator = [
  requiredString('name', { min: 1, max: 200 }),
  optionalString('description', { max: 2000 }),
  requiredNumber('monthlyPrice', { min: 0 }),
  requiredInt('trialPeriod', { min: 0, max: 365 }),
  optionalNumber('quarterlyPrice', { min: 0 }),
  optionalNumber('semiAnnualPrice', { min: 0 }),
  optionalNumber('annualPrice', { min: 0 }),
  optionalObject('limits'),
  optionalObject('features'),
  optionalEnum('supportLevel', ['email', 'chat', 'dedicated']),
  optionalBoolean('apiAccess'),
  optionalBoolean('whiteLabel'),
  optionalBoolean('isActive'),
  optionalInt('sortOrder', { min: 0 }),
  validate,
];

const updatePlanValidator = [
  optionalString('name', { max: 200 }),
  optionalString('description', { max: 2000 }),
  optionalNumber('monthlyPrice', { min: 0 }),
  optionalInt('trialPeriod', { min: 0, max: 365 }),
  optionalNumber('quarterlyPrice', { min: 0 }),
  optionalNumber('semiAnnualPrice', { min: 0 }),
  optionalNumber('annualPrice', { min: 0 }),
  optionalObject('limits'),
  optionalObject('features'),
  optionalEnum('supportLevel', ['email', 'chat', 'dedicated']),
  optionalBoolean('apiAccess'),
  optionalBoolean('whiteLabel'),
  optionalBoolean('isActive'),
  optionalInt('sortOrder', { min: 0 }),
  validate,
];

module.exports = {
  createPlanValidator,
  updatePlanValidator,
};
