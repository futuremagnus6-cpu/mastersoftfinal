const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const {
  requiredString, optionalString, requiredNumber, optionalNumber,
  requiredInt, optionalInt, optionalBoolean, requiredBoolean,
  optionalDate, optionalEnum, requiredArray, optionalArray,
} = require('./common.validators');

const GST_RATES = [0, 0.25, 1, 3, 5, 12, 18, 28];
const PRODUCT_STATUSES = ['active', 'inactive', 'discontinued'];
const PRODUCT_TYPES = ['goods', 'services', 'digital'];

const createProductValidator = [
  requiredString('name', { min: 1, max: 200 }),
  optionalString('sku', { max: 100 }),
  optionalString('barcode', { max: 100 }),
  optionalString('category', { max: 100 }),
  optionalString('description', { max: 2000 }),
  requiredNumber('mrp', { min: 0 }),
  requiredNumber('sellingPrice', { min: 0 }),
  optionalNumber('purchasePrice', { min: 0 }),
  requiredInt('stock', { min: 0 }),
  optionalInt('minStock', { min: 0 }),
  optionalInt('maxStock', { min: 0 }),
  optionalString('unit', { max: 50 }),
  optionalString('hsnCode', { max: 20 }),
  optionalNumber('gstRate', { min: 0, max: 100 }),
  optionalString('manufacturer', { max: 200 }),
  optionalString('brand', { max: 200 }),
  optionalString('batchNumber', { max: 100 }),
  optionalDate('expDate'),
  optionalEnum('status', PRODUCT_STATUSES),
  optionalEnum('productType', PRODUCT_TYPES),
  optionalString('location', { max: 100 }),
  optionalNumber('weight', { min: 0 }),
  optionalString('size', { max: 50 }),
  optionalString('color', { max: 50 }),
  validate,
];

const updateProductValidator = [
  optionalString('name', { max: 200 }),
  optionalString('sku', { max: 100 }),
  optionalString('barcode', { max: 100 }),
  optionalString('category', { max: 100 }),
  optionalString('description', { max: 2000 }),
  optionalNumber('mrp', { min: 0 }),
  optionalNumber('sellingPrice', { min: 0 }),
  optionalNumber('purchasePrice', { min: 0 }),
  optionalInt('stock', { min: 0 }),
  optionalInt('minStock', { min: 0 }),
  optionalInt('maxStock', { min: 0 }),
  optionalString('unit', { max: 50 }),
  optionalString('hsnCode', { max: 20 }),
  optionalNumber('gstRate', { min: 0, max: 100 }),
  optionalString('manufacturer', { max: 200 }),
  optionalString('brand', { max: 200 }),
  optionalString('batchNumber', { max: 100 }),
  optionalDate('expDate'),
  optionalEnum('status', PRODUCT_STATUSES),
  optionalEnum('productType', PRODUCT_TYPES),
  optionalString('location', { max: 100 }),
  optionalNumber('weight', { min: 0 }),
  optionalString('size', { max: 50 }),
  optionalString('color', { max: 50 }),
  validate,
];

const updateStockValidator = [
  requiredInt('stock', { min: 0 }),
  optionalString('reason', { max: 500 }),
  validate,
];

const importProductsValidator = [validate];

const bulkDeleteValidator = [
  requiredArray('ids', { minLen: 1, maxLen: 500 }),
  body('ids.*').isMongoId().withMessage('Each ID must be a valid MongoDB ObjectId'),
  validate,
];

const createStockTransferValidator = [
  requiredString('fromBranch', { max: 50 }),
  requiredString('toBranch', { max: 50 }),
  requiredArray('items', { minLen: 1 }),
  body('items.*.product').isMongoId().withMessage('Each item product must be a valid ObjectId'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Each item quantity must be a positive integer'),
  optionalString('notes', { max: 500 }),
  validate,
];

module.exports = {
  createProductValidator,
  updateProductValidator,
  updateStockValidator,
  importProductsValidator,
  bulkDeleteValidator,
  createStockTransferValidator,
};
