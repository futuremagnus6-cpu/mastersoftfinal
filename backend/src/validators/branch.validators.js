const { validate } = require('../middleware/validate');
const {
  requiredString, optionalString, requiredPhone, optionalPhone,
  requiredEmail, optionalEmail, pincode, optionalBoolean,
} = require('./common.validators');

const createBranchValidator = [
  requiredString('name', { min: 1, max: 200 }),
  optionalString('code', { max: 50 }),
  optionalPhone('phone'),
  optionalEmail('email'),
  optionalString('address', { max: 500 }),
  optionalString('city', { max: 100 }),
  optionalString('state', { max: 100 }),
  pincode().optional({ values: 'null' }),
  optionalString('manager', { max: 100 }),
  validate,
];

const updateBranchValidator = [
  optionalString('name', { max: 200 }),
  optionalString('code', { max: 50 }),
  optionalPhone('phone'),
  optionalEmail('email'),
  optionalString('address', { max: 500 }),
  optionalString('city', { max: 100 }),
  optionalString('state', { max: 100 }),
  pincode().optional({ values: 'null' }),
  optionalString('manager', { max: 100 }),
  optionalBoolean('isActive'),
  validate,
];

module.exports = {
  createBranchValidator,
  updateBranchValidator,
};
