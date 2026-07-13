const Order = require('../models/Order');
const Product = require('../models/Product');
const Expense = require('../models/Expense');
const Customer = require('../models/Customer');
const Purchase = require('../models/Purchase');
const { scopeQuery } = require('../middleware/multiTenant');

exports.getSalesReport = async (req, res, next) => {
  try {
    const { startDate, endDate, groupBy = 'day' } = req.query;
    const query = scopeQuery({ status: 'completed' }, req);
    if (startDate || endDate) { query.createdAt = {}; if (startDate) query.createdAt.$gte = new Date(startDate); if (endDate) query.createdAt.$lte = new Date(endDate); }
    let dateFormat;
    if (groupBy === 'day') dateFormat = { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } };
    else if (groupBy === 'month') dateFormat = { $dateToString: { format: '%Y-%m', date: '$createdAt' } };
    else if (groupBy === 'year') dateFormat = { $dateToString: { format: '%Y', date: '$createdAt' } };
    const report = await Order.aggregate([
      { $match: query },
      { $group: { _id: dateFormat, orders: { $sum: 1 }, revenue: { $sum: '$grandTotal' }, items: { $sum: { $sum: '$items.quantity' } }, discount: { $sum: '$totalDiscount' }, gst: { $sum: '$totalGst' } } },
      { $sort: { _id: 1 } },
    ]);
    const totals = report.reduce((a, r) => ({ orders: a.orders + r.orders, revenue: a.revenue + r.revenue, items: a.items + r.items, discount: a.discount + r.discount, gst: a.gst + r.gst }), { orders: 0, revenue: 0, items: 0, discount: 0, gst: 0 });
    res.json({ success: true, data: report, totals });
  } catch (error) { next(error); }
};

exports.getInventoryReport = async (req, res, next) => {
  try {
    const query = scopeQuery({ isActive: true }, req);
    const products = await Product.find(query).select('name sku category pricing.inventory quantity pricing.purchasePrice inventory.minStockLevel inventory.quantity batches').lean();
    const categories = await Product.aggregate([{ $match: query }, { $group: { _id: '$category', count: { $sum: 1 }, totalValue: { $sum: { $multiply: ['$inventory.quantity', '$pricing.purchasePrice'] } }, totalStock: { $sum: '$inventory.quantity' } } }, { $sort: { _id: 1 } }]);
    const totalValue = products.reduce((s, p) => s + (p.inventory.quantity * (p.pricing.purchasePrice || 0)), 0);
    const lowStock = products.filter(p => p.inventory.quantity <= p.inventory.minStockLevel && p.inventory.quantity > 0).length;
    const outOfStock = products.filter(p => p.inventory.quantity <= 0).length;
    res.json({ success: true, data: { products, categories, summary: { totalProducts: products.length, totalValue, totalStock: products.reduce((s, p) => s + p.inventory.quantity, 0), lowStock, outOfStock } } });
  } catch (error) { next(error); }
};

exports.getGstReport = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const query = scopeQuery({ status: 'completed' }, req);
    if (startDate || endDate) { query.createdAt = {}; if (startDate) query.createdAt.$gte = new Date(startDate); if (endDate) query.createdAt.$lte = new Date(endDate); }
    const report = await Order.aggregate([
      { $match: query },
      { $group: { _id: '$gstInvoiceType', orders: { $sum: 1 }, taxable: { $sum: { $subtract: ['$subtotal', '$totalDiscount'] } }, cgst: { $sum: '$totalCgst' }, sgst: { $sum: '$totalSgst' }, igst: { $sum: '$totalIgst' }, totalGst: { $sum: '$totalGst' } } },
    ]);
    const gstSummary = report.reduce((a, r) => ({ taxable: a.taxable + r.taxable, cgst: a.cgst + r.cgst, sgst: a.sgst + r.sgst, igst: a.igst + r.igst, totalGst: a.totalGst + r.totalGst }), { taxable: 0, cgst: 0, sgst: 0, igst: 0, totalGst: 0 });
    res.json({ success: true, data: { byType: report, summary: gstSummary } });
  } catch (error) { next(error); }
};

exports.getProfitLoss = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const dateQuery = {};
    if (startDate || endDate) { dateQuery.createdAt = {}; if (startDate) dateQuery.createdAt.$gte = new Date(startDate); if (endDate) dateQuery.createdAt.$lte = new Date(endDate); }
    const [sales, expenses, purchases, customerCount] = await Promise.all([
      Order.aggregate([{ $match: { ...scopeQuery({ status: 'completed' }, req), ...dateQuery } }, { $group: { _id: null, revenue: { $sum: '$grandTotal' }, cost: { $sum: { $sum: { $map: { input: '$items', as: 'item', in: { $multiply: ['$$item.quantity', { $ifNull: ['$$item.sellingPrice', 0] }] } } } } }, gst: { $sum: '$totalGst' }, orders: { $sum: 1 } } }]),
      Expense.aggregate([{ $match: { ...scopeQuery({}, req), ...dateQuery } }, { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }]),
      Purchase.aggregate([{ $match: { ...scopeQuery({ status: 'received' }, req), ...dateQuery } }, { $group: { _id: null, total: { $sum: '$grandTotal' } } }]),
      Customer.countDocuments(scopeQuery({}, req)),
    ]);
    const revenue = sales[0]?.revenue || 0;
    const totalExpenses = (expenses[0]?.total || 0) + (purchases[0]?.total || 0);
    const grossProfit = revenue - totalExpenses;
    res.json({ success: true, data: { revenue, totalExpenses, grossProfit, netProfit: grossProfit, orderCount: sales[0]?.orders || 0, expenseCount: expenses[0]?.count || 0, totalCustomers: customerCount } });
  } catch (error) { next(error); }
};

exports.getCustomerReport = async (req, res, next) => {
  try {
    const query = scopeQuery({}, req);
    const [total, active, newCustomers, repeatCustomers, topCustomers] = await Promise.all([
      Customer.countDocuments(query),
      Customer.countDocuments({ ...query, totalOrders: { $gt: 0 } }),
      Customer.countDocuments({ ...query, createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } }),
      Customer.countDocuments({ ...query, totalOrders: { $gt: 1 } }),
      Customer.find(query).sort({ totalSpent: -1 }).limit(10).select('name mobile totalOrders totalSpent loyalty.points'),
    ]);
    res.json({ success: true, data: { total, activeCustomers: active, newCustomers, repeatCustomers, topCustomers, churnRate: total > 0 ? ((total - active) / total * 100).toFixed(1) : 0 } });
  } catch (error) { next(error); }
};
