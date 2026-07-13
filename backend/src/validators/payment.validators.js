const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const {
  requiredString, optionalString, requiredNumber, optionalNumber,
  requiredEnum, optionalEnum,
} = require('./common.validators');

const createPaymentOrderValidator = [
  requiredString('planId', { max: 50 }),
  optionalInt('durationMonths', { min: 1, max: 12 }),
  optionalString('shopId', { max: 50 }),
  validate,
];

const verifyPaymentValidator = [
  requiredString('razorpay_order_id', { max: 100 }),
  requiredString('razorpay_payment_id', { max: 100 }),
  requiredString('razorpay_signature', { max: 300 }),
  validate,
];

const extendSubscriptionValidator = [
  optionalEnum('durationMonths', [1, 3, 6, 12]),
  optionalString('planId', { max: 50 }),
  validate,
];

const cancelSubscriptionValidator = [
  optionalString('reason', { max: 1000 }),
  validate,
];

const razorpayWebhookValidator = [validate];

function optionalInt(field, { min, max } = {}) {
  let chain = body(field)
    .optional({ values: 'null' })
    .isInt().withMessage(`${field} must be an integer`);
  if (min !== undefined) chain = chain.isInt({ min }).withMessage(`${field} must be at least ${min}`);
  if (max !== undefined) chain = chain.isInt({ max }).withMessage(`${field} must be at most ${max}`);
  return chain;
}

module.exports = {
  createPaymentOrderValidator,
  verifyPaymentValidator,
  extendSubscriptionValidator,
  cancelSubscriptionValidator,
  razorpayWebhookValidator,
};
