const Customer = require('../models/Customer');
const { AppError } = require('../middleware/errorHandler');
const { scopeQuery } = require('../middleware/multiTenant');

exports.getCustomerActivity = async (req, res, next) => {
  try {
    const Order = require('../models/Order');
    const loyaltyTx = require('../models/LoyaltyTransaction');
    const SupportTicket = require('../models/SupportTicket');
    const customerId = req.params.customerId;
    const [orders, loyaltyTransactions, tickets] = await Promise.all([
      Order.find(scopeQuery({ customer: customerId }, req)).sort({ createdAt: -1 }).limit(20),
      loyaltyTx.find(scopeQuery({ customer: customerId }, req)).sort({ createdAt: -1 }).limit(20),
      SupportTicket.find(scopeQuery({ customer: customerId }, req)).sort({ createdAt: -1 }).limit(10),
    ]);
    res.json({ success: true, data: { orders, loyaltyTransactions, tickets } });
  } catch (error) { next(error); }
};

exports.addCustomerNote = async (req, res, next) => {
  try {
    const customer = await Customer.findOne(scopeQuery({ _id: req.params.customerId }, req));
    if (!customer) throw new AppError('Customer not found', 404);
    customer.notes = req.body.note ? `${req.body.note}\n---\n${customer.notes || ''}` : customer.notes;
    customer.updatedBy = req.userId;
    await customer.save();
    res.json({ success: true, message: 'Note added', data: customer });
  } catch (error) { next(error); }
};

exports.getCustomerSegments = async (req, res, next) => {
  try {
    const query = scopeQuery({}, req);
    const [highValue, regular, atRisk, inactive] = await Promise.all([
      Customer.countDocuments({ ...query, totalSpent: { $gte: 10000 } }),
      Customer.countDocuments({ ...query, totalOrders: { $gte: 3 }, totalSpent: { $lt: 10000 } }),
      Customer.countDocuments({ ...query, totalOrders: { $gt: 0 }, lastPurchaseDate: { $lt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), $gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) } }),
      Customer.countDocuments({ ...query, $or: [{ lastPurchaseDate: { $lt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) } }, { totalOrders: 0 }] }),
    ]);
    const total = await Customer.countDocuments(query);
    res.json({ success: true, data: { segments: { highValue: { count: highValue, percent: ((highValue / total) * 100).toFixed(1) }, regular: { count: regular, percent: ((regular / total) * 100).toFixed(1) }, atRisk: { count: atRisk, percent: ((atRisk / total) * 100).toFixed(1) }, inactive: { count: inactive, percent: ((inactive / total) * 100).toFixed(1) } }, total } });
  } catch (error) { next(error); }
};
