const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const {
  requiredString, optionalString, optionalEmail, optionalPhone,
  requiredEnum, optionalEnum, optionalArray, optionalInt,
  optionalBoolean,
} = require('./common.validators');

const TICKET_CATEGORIES = ['order_issue', 'payment_issue', 'product_issue', 'delivery', 'general', 'return', 'other'];
const TICKET_PRIORITIES = ['low', 'medium', 'high', 'urgent'];
const TICKET_STATUSES = ['open', 'assigned', 'in_progress', 'resolved', 'closed'];
const TICKET_SOURCES = ['portal', 'whatsapp', 'phone', 'pos', 'email'];

const createTicketValidator = [
  requiredEnum('category', TICKET_CATEGORIES),
  requiredString('subject', { min: 1, max: 200 }),
  requiredString('description', { min: 1, max: 5000 }),
  optionalEnum('priority', TICKET_PRIORITIES),
  optionalEnum('source', TICKET_SOURCES),
  optionalString('customerName', { max: 200 }),
  optionalPhone('customerMobile'),
  optionalEmail('customerEmail'),
  optionalString('orderId', { max: 50 }),
  optionalArray('attachments'),
  validate,
];

const updateTicketValidator = [
  optionalEnum('status', TICKET_STATUSES),
  optionalEnum('priority', TICKET_PRIORITIES),
  optionalEnum('category', TICKET_CATEGORIES),
  optionalString('subject', { max: 200 }),
  optionalString('description', { max: 5000 }),
  optionalString('assignedTo', { max: 50 }),
  optionalInt('rating', { min: 1, max: 5 }),
  optionalString('ratingComment', { max: 500 }),
  validate,
];

const addMessageValidator = [
  requiredString('message', { min: 1, max: 10000 }),
  optionalBoolean('isInternal'),
  optionalArray('attachments'),
  validate,
];

module.exports = {
  createTicketValidator,
  updateTicketValidator,
  addMessageValidator,
};
