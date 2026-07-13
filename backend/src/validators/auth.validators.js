const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const {
  requiredString, requiredEmail, requiredPhone, password, optionalString,
  optionalEmail, requiredEnum, optionalEnum,
} = require('./common.validators');

// ─── Login ───
const loginValidator = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email')
    .normalizeEmail()
    .isLength({ max: 254 }).withMessage('Email must be at most 254 characters'),
  body('password')
    .notEmpty().withMessage('Password is required')
    .isString().withMessage('Password must be a string')
    .isLength({ min: 1, max: 128 }).withMessage('Password must be between 1 and 128 characters'),
  validate,
];

// ─── Register ───
const registerValidator = [
  requiredString('name', { min: 2, max: 100 }),
  requiredEmail('email'),
  requiredPhone('phone'),
  body('password')
    .notEmpty().withMessage('Password is required')
    .isString().withMessage('Password must be a string')
    .isLength({ min: 6, max: 128 }).withMessage('Password must be between 6 and 128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain uppercase, lowercase, and a number'),
  optionalEnum('role', ['super_admin', 'shop_admin', 'manager', 'staff']),
  validate,
];

// ─── Forgot Password ───
const forgotPasswordValidator = [
  requiredEmail('email'),
  validate,
];

// ─── Reset Password ───
const resetPasswordValidator = [
  body('token')
    .trim()
    .notEmpty().withMessage('Reset token is required')
    .isString().withMessage('Reset token must be a string')
    .isLength({ min: 1, max: 256 }).withMessage('Reset token is invalid'),
  password('password'),
  validate,
];

// ─── 2FA ───
const verify2faValidator = [
  requiredEmail('email'),
  body('token')
    .trim()
    .notEmpty().withMessage('2FA token is required')
    .isString().withMessage('2FA token must be a string')
    .isLength({ min: 6, max: 6 }).withMessage('2FA token must be exactly 6 characters'),
  validate,
];

const refreshTokenValidator = [
  body('refreshToken')
    .trim()
    .notEmpty().withMessage('Refresh token is required')
    .isString().withMessage('Refresh token must be a string')
    .isLength({ min: 1, max: 512 }).withMessage('Invalid refresh token'),
  validate,
];

const changePasswordValidator = [
  body('currentPassword')
    .notEmpty().withMessage('Current password is required')
    .isString().withMessage('Current password must be a string'),
  password('newPassword'),
  validate,
];

const updateProfileValidator = [
  optionalString('name', { max: 100 }),
  optionalEmail('email'),
  optionalString('phone', { max: 20 }),
  optionalString('language', { max: 10 }),
  optionalString('theme', { max: 10 }),
  validate,
];

const setup2faValidator = [validate];
const enable2faValidator = [
  body('token')
    .trim()
    .notEmpty().withMessage('2FA token is required')
    .isString().withMessage('2FA token must be a string')
    .isLength({ min: 6, max: 6 }).withMessage('2FA token must be exactly 6 characters'),
  validate,
];
const disable2faValidator = [...enable2faValidator];

module.exports = {
  loginValidator,
  registerValidator,
  forgotPasswordValidator,
  resetPasswordValidator,
  verify2faValidator,
  refreshTokenValidator,
  changePasswordValidator,
  updateProfileValidator,
  setup2faValidator,
  enable2faValidator,
  disable2faValidator,
};
