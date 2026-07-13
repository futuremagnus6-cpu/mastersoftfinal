const { validationResult, query } = require('express-validator');

/**
 * Middleware that checks express-validator validationResult and
 * immediately rejects the request with a structured 400 response
 * if any validation errors exist.
 *
 * Usage:
 *   router.post('/endpoint', [body('name').isString(), validate], handler);
 *
 * The `validate` middleware should always be the LAST item in
 * the validation array so all checks run before the result is inspected.
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      code: 'VALIDATION_ERROR',
      errors: errors.array().map((err) => ({
        field: err.path || err.param,
        message: err.msg,
        value: err.value,
        // location: err.location (body, query, params, etc.)
      })),
    });
  }
  next();
};

/**
 * Common query-parameter validators reused across many routes.
 */
const paginationValidators = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer')
    .toInt(),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('Limit must be an integer between 1 and 1000')
    .toInt(),
  query('sort')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Sort param must be a string of max 50 characters'),
  query('order')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Order must be "asc" or "desc"'),
];

const dateRangeValidators = [
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('startDate must be a valid ISO 8601 date'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('endDate must be a valid ISO 8601 date'),
  query('period')
    .optional()
    .isIn(['daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'custom'])
    .withMessage('Period must be one of: daily, weekly, monthly, quarterly, yearly, custom'),
];

module.exports = {
  validate,
  paginationValidators,
  dateRangeValidators,
};
