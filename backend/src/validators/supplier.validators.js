const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const {
  requiredString, optionalString, requiredEmail, optionalEmail,
  requiredPhone, optionalPhone, requiredNumber, optionalNumber,
  requiredDate, optionalDate, gstin, pan, pincode, requiredMongoId,
  requiredArray, optionalArray, optionalInt,
  optionalEnum, optionalObject, optionalBoolean,
} = require('./common.validators');

// ─── Supplier ───

const createSupplierValidator = [
  requiredString('name', { min: 1, max: 200 }),
  optionalString('company', { max: 200 }),
  requiredPhone('mobile'),
  optionalEmail('email'),
  gstin().optional({ values: 'null' }),
  pan().optional({ values: 'null' }),
  optionalString('address', { max: 500 }),
  optionalString('city', { max: 100 }),
  optionalString('state', { max: 100 }),
  pincode().optional({ values: 'null' }),
  optionalNumber('creditLimit', { min: 0 }),
  optionalString('paymentTerms', { max: 100 }),
  optionalInt('leadTime', { min: 0 }),
  optionalString('notes', { max: 1000 }),
  optionalObject('bankDetails'),
  validate,
];

const updateSupplierValidator = [
  optionalString('name', { max: 200 }),
  optionalString('company', { max: 200 }),
  optionalPhone('mobile'),
  optionalEmail('email'),
  gstin().optional({ values: 'null' }),
  pan().optional({ values: 'null' }),
  optionalString('address', { max: 500 }),
  optionalString('city', { max: 100 }),
  optionalString('state', { max: 100 }),
  pincode().optional({ values: 'null' }),
  optionalNumber('creditLimit', { min: 0 }),
  optionalString('paymentTerms', { max: 100 }),
  optionalInt('leadTime', { min: 0 }),
  optionalString('notes', { max: 1000 }),
  optionalObject('bankDetails'),
  optionalBoolean('isActive'),
  validate,
];

// ─── Purchase ───

const purchaseStatuses = ['draft', 'pending', 'ordered', 'received', 'cancelled'];
const purchasePaymentStatuses = ['pending', 'partial', 'paid'];

const createPurchaseValidator = [
  requiredMongoId('supplier'),
  requiredDate('orderDate'),
  optionalDate('expectedDelivery'),
  requiredArray('items', { minLen: 1 }),
  body('items.*.product')
    .notEmpty().withMessage('Product ID is required')
    .isMongoId().withMessage('Product must be a valid ObjectId'),
  body('items.*.quantity')
    .isFloat({ min: 0.001 }).withMessage('Quantity must be at least 0.001')
    .toFloat(),
  body('items.*.unitPrice')
    .isFloat({ min: 0 }).withMessage('Unit price must be non-negative')
    .toFloat(),
  optionalNumber('discount', { min: 0 }),
  optionalNumber('shippingCost', { min: 0 }),
  optionalNumber('taxAmount', { min: 0 }),
  optionalString('notes', { max: 1000 }),
  optionalString('referenceNumber', { max: 100 }),
  optionalEnum('status', purchaseStatuses),
  validate,
];

const updatePurchaseValidator = [
  optionalDate('orderDate'),
  optionalDate('expectedDelivery'),
  optionalArray('items', { minLen: 1 }),
  body('items.*.product')
    .optional({ values: 'null' })
    .isMongoId().withMessage('Product must be a valid ObjectId'),
  body('items.*.quantity')
    .optional({ values: 'null' })
    .isFloat({ min: 0.001 }).withMessage('Quantity must be at least 0.001')
    .toFloat(),
  body('items.*.unitPrice')
    .optional({ values: 'null' })
    .isFloat({ min: 0 }).withMessage('Unit price must be non-negative')
    .toFloat(),
  optionalNumber('discount', { min: 0 }),
  optionalNumber('shippingCost', { min: 0 }),
  optionalNumber('taxAmount', { min: 0 }),
  optionalString('notes', { max: 1000 }),
  optionalEnum('status', purchaseStatuses),
  validate,
];

const receivePurchaseValidator = [
  optionalArray('items', { minLen: 1 }),
  body('items.*.product')
    .optional({ values: 'null' })
    .isMongoId().withMessage('Product must be a valid ObjectId'),
  body('items.*.receivedQuantity')
    .optional({ values: 'null' })
    .isFloat({ min: 0 }).withMessage('Received quantity must be non-negative')
    .toFloat(),
  body('items.*.acceptedQuantity')
    .optional({ values: 'null' })
    .isFloat({ min: 0 }).withMessage('Accepted quantity must be non-negative')
    .toFloat(),
  body('items.*.rejectedQuantity')
    .optional({ values: 'null' })
    .isFloat({ min: 0 }).withMessage('Rejected quantity must be non-negative')
    .toFloat(),
  body('items.*.rejectedReason')
    .optional({ values: 'null' })
    .trim().isString().isLength({ max: 500 }).withMessage('Rejected reason must be at most 500 characters'),
  optionalDate('receivedDate'),
  optionalString('notes', { max: 1000 }),
  validate,
];

// ─── Expense ───

const expenseCategories = [
  'rent', 'utilities', 'salary', 'maintenance', 'marketing',
  'transport', 'purchase', 'tax', 'insurance', 'other',
];

const createExpenseValidator = [
  requiredString('category', { max: 100 }),
  requiredNumber('amount', { min: 0.01 }),
  optionalDate('expenseDate'),
  requiredString('description', { min: 1, max: 500 }),
  optionalString('reference', { max: 100 }),
  optionalString('paymentMethod', { max: 50 }),
  optionalString('vendor', { max: 200 }),
  optionalString('notes', { max: 1000 }),
  validate,
];

const updateExpenseValidator = [
  optionalString('category', { max: 100 }),
  optionalNumber('amount', { min: 0.01 }),
  optionalDate('expenseDate'),
  optionalString('description', { max: 500 }),
  optionalString('reference', { max: 100 }),
  optionalString('paymentMethod', { max: 50 }),
  optionalString('vendor', { max: 200 }),
  optionalString('notes', { max: 1000 }),
  validate,
];

const approveExpenseValidator = [
  optionalString('notes', { max: 500 }),
  validate,
];

// ─── Helpers ───

module.exports = {
  createSupplierValidator,
  updateSupplierValidator,
  createPurchaseValidator,
  updatePurchaseValidator,
  receivePurchaseValidator,
  createExpenseValidator,
  updateExpenseValidator,
  approveExpenseValidator,
};
