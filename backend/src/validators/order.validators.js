const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const {
  requiredString, optionalString, requiredNumber, optionalNumber,
  requiredInt, optionalInt, requiredEnum, optionalEnum,
  requiredArray, optionalArray, optionalDate, requiredMongoId,
  optionalBoolean,
} = require('./common.validators');

const ORDER_STATUSES = ['pending', 'completed', 'cancelled', 'returned', 'partial_return'];
const PAYMENT_STATUSES = ['pending', 'partial', 'completed', 'refunded'];
const ORDER_TYPES = ['retail', 'wholesale', 'dealer', 'online'];
const PAYMENT_METHODS = ['cash', 'upi', 'card', 'company', 'credit', 'mixed', 'advance'];
const GST_INVOICE_TYPES = ['b2b', 'b2c'];

const orderItemValidator = [
  body('items.*.product')
    .notEmpty().withMessage('Product ID is required for each item')
    .isMongoId().withMessage('Each product must be a valid MongoDB ObjectId'),
  body('items.*.quantity')
    .notEmpty().withMessage('Quantity is required for each item')
    .isFloat({ min: 0.001 }).withMessage('Quantity must be at least 0.001')
    .toFloat(),
  body('items.*.sellingPrice')
    .notEmpty().withMessage('Selling price is required for each item')
    .isFloat({ min: 0 }).withMessage('Selling price must be non-negative')
    .toFloat(),
  body('items.*.mrp')
    .optional({ values: 'null' })
    .isFloat({ min: 0 }).withMessage('MRP must be non-negative')
    .toFloat(),
  body('items.*.discountPercent')
    .optional({ values: 'null' })
    .isFloat({ min: 0, max: 100 }).withMessage('Discount percent must be between 0 and 100')
    .toFloat(),
  body('items.*.gstRate')
    .optional({ values: 'null' })
    .isFloat({ min: 0, max: 100 }).withMessage('GST rate must be between 0 and 100')
    .toFloat(),
  body('items.*.batchNumber')
    .optional({ values: 'null' })
    .trim().isString().isLength({ max: 100 }).withMessage('Batch number must be at most 100 characters'),
  body('items.*.expDate')
    .optional({ values: 'null' })
    .isISO8601().withMessage('Expiry date must be a valid date'),
];

const paymentValidator = [
  body('payments.*.method')
    .notEmpty().withMessage('Payment method is required')
    .isIn(PAYMENT_METHODS).withMessage(`Method must be one of: ${PAYMENT_METHODS.join(', ')}`),
  body('payments.*.amount')
    .notEmpty().withMessage('Payment amount is required')
    .isFloat({ min: 0.01 }).withMessage('Payment amount must be at least 0.01')
    .toFloat(),
  body('payments.*.reference')
    .optional({ values: 'null' })
    .trim().isString().isLength({ max: 200 }).withMessage('Payment reference must be at most 200 characters'),
];

const createOrderValidator = [
  requiredEnum('type', ORDER_TYPES),
  requiredArray('items', { minLen: 1 }),
  ...orderItemValidator,
  requiredNumber('subtotal', { min: 0 }),
  optionalNumber('totalDiscount', { min: 0 }),
  optionalNumber('totalGst', { min: 0 }),
  requiredNumber('grandTotal', { min: 0 }),
  optionalNumber('roundOff'),
  optionalString('customerName', { max: 200 }),
  optionalString('customerMobile', { max: 20 }),
  optionalString('customerGstin', { max: 20 }),
  optionalString('notes', { max: 2000 }),
  optionalEnum('paymentStatus', PAYMENT_STATUSES),
  optionalNumber('paidAmount', { min: 0 }),
  optionalArray('payments'),
  ...paymentValidator,
  optionalBoolean('isOffline'),
  optionalString('offlineId', { max: 100 }),
  optionalEnum('gstInvoiceType', GST_INVOICE_TYPES),
  validate,
];

const updateOrderValidator = [
  optionalEnum('type', ORDER_TYPES),
  optionalArray('items', { minLen: 1 }),
  ...orderItemValidator,
  optionalNumber('subtotal', { min: 0 }),
  optionalNumber('totalDiscount', { min: 0 }),
  optionalNumber('totalGst', { min: 0 }),
  optionalNumber('grandTotal', { min: 0 }),
  optionalNumber('roundOff'),
  optionalString('customerName', { max: 200 }),
  optionalString('customerMobile', { max: 20 }),
  optionalString('notes', { max: 2000 }),
  optionalEnum('paymentStatus', PAYMENT_STATUSES),
  optionalNumber('paidAmount', { min: 0 }),
  optionalArray('payments'),
  ...paymentValidator,
  optionalEnum('gstInvoiceType', GST_INVOICE_TYPES),
  validate,
];

const cancelOrderValidator = [
  optionalString('reason', { max: 1000 }),
  validate,
];

const syncOfflineOrdersValidator = [
  requiredArray('orders', { minLen: 1 }),
  validate,
];

// ─── Refund / Return ───

const createReturnValidator = [
  requiredMongoId('order'),
  requiredArray('items', { minLen: 1 }),
  body('items.*.product')
    .notEmpty().withMessage('Product ID is required')
    .isMongoId().withMessage('Product must be a valid ObjectId'),
  body('items.*.quantity')
    .isInt({ min: 1 }).withMessage('Return quantity must be a positive integer')
    .toInt(),
  body('items.*.reason')
    .optional({ values: 'null' })
    .trim().isString().isLength({ max: 500 }).withMessage('Reason must be at most 500 characters'),
  optionalEnum('status', ['pending', 'approved', 'rejected', 'processed']),
  optionalString('notes', { max: 1000 }),
  optionalNumber('refundAmount', { min: 0 }),
  validate,
];

const updateReturnValidator = [
  optionalEnum('status', ['pending', 'approved', 'rejected', 'processed']),
  optionalString('notes', { max: 1000 }),
  optionalNumber('refundAmount', { min: 0 }),
  body('items')
    .optional({ values: 'null' })
    .isArray({ min: 1 }).withMessage('Items must be a non-empty array'),
  validate,
];

const processReturnValidator = [
  optionalString('notes', { max: 1000 }),
  validate,
];

module.exports = {
  createOrderValidator,
  updateOrderValidator,
  cancelOrderValidator,
  syncOfflineOrdersValidator,
  createReturnValidator,
  updateReturnValidator,
  processReturnValidator,
};
