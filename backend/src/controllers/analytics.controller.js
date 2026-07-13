const Order = require('../models/Order');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const Shop = require('../models/Shop');
const { scopeQuery } = require('../middleware/multiTenant');

exports.getRevenueAnalytics = async (req, res, next) => {
  try {
    const { period = 'monthly', startDate, endDate } = req.query;

    // Super admins see subscription/billing revenue; shop admins see their order revenue
    if (req.user?.role === 'super_admin') {
      const BillingTransaction = require('../models/BillingTransaction');
      const match = { status: 'captured', paidAt: { $exists: true } };
      if (startDate || endDate) {
        match.paidAt = {};
        if (startDate) match.paidAt.$gte = new Date(startDate);
        if (endDate) match.paidAt.$lte = new Date(endDate);
      }
      let groupFormat;
      if (period === 'daily') groupFormat = { $dateToString: { format: '%Y-%m-%d', date: '$paidAt' } };
      else if (period === 'yearly') groupFormat = { $dateToString: { format: '%Y', date: '$paidAt' } };
      else groupFormat = { $dateToString: { format: '%Y-%m', date: '$paidAt' } };
      const revenue = await BillingTransaction.aggregate([
        { $match: match },
        { $group: { _id: groupFormat, revenue: { $sum: '$amountPaid' }, orders: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]);
      return res.json({ success: true, data: revenue });
    }

    // Shop admin: revenue from their own shop's completed orders
    const query = scopeQuery({ status: 'completed' }, req);
    if (startDate || endDate) { query.createdAt = {}; if (startDate) query.createdAt.$gte = new Date(startDate); if (endDate) query.createdAt.$lte = new Date(endDate); }
    let groupFormat;
    if (period === 'daily') groupFormat = { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } };
    else if (period === 'yearly') groupFormat = { $dateToString: { format: '%Y', date: '$createdAt' } };
    else groupFormat = { $dateToString: { format: '%Y-%m', date: '$createdAt' } };
    const revenue = await Order.aggregate([{ $match: query }, { $group: { _id: groupFormat, revenue: { $sum: '$grandTotal' }, orders: { $sum: 1 }, items: { $sum: { $sum: '$items.quantity' } }, gst: { $sum: '$totalGst' } } }, { $sort: { _id: 1 } }]);
    res.json({ success: true, data: revenue });
  } catch (error) { next(error); }
};

exports.getProductAnalytics = async (req, res, next) => {
  try {
    const query = scopeQuery({ isActive: true }, req);
    const [topSelling, categoryBreakdown, stockValue] = await Promise.all([
      Order.aggregate([{ $match: { ...scopeQuery({ status: 'completed' }, req), createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } }, { $unwind: '$items' }, { $group: { _id: '$items.productName', totalQty: { $sum: '$items.quantity' }, totalRevenue: { $sum: '$items.total' } } }, { $sort: { totalRevenue: -1 } }, { $limit: 10 }]),
      Product.aggregate([{ $match: query }, { $group: { _id: '$category', count: { $sum: 1 }, totalStock: { $sum: '$inventory.quantity' }, avgPrice: { $avg: '$pricing.sellingPrice' } } }, { $sort: { count: -1 } }]),
      Product.aggregate([{ $match: query }, { $group: { _id: null, total: { $sum: { $multiply: ['$inventory.quantity', '$pricing.purchasePrice'] } } } }]),
    ]);
    res.json({ success: true, data: { topSelling, categoryBreakdown, stockValue: stockValue[0]?.total || 0 } });
  } catch (error) { next(error); }
};

exports.getCustomerAnalytics = async (req, res, next) => {
  try {
    const query = scopeQuery({}, req);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const [total, active, newCustomers, churned, topCustomers] = await Promise.all([
      Customer.countDocuments(query),
      Customer.countDocuments({ ...query, lastPurchaseDate: { $gte: thirtyDaysAgo } }),
      Customer.countDocuments({ ...query, createdAt: { $gte: thirtyDaysAgo } }),
      Customer.countDocuments({ ...query, totalOrders: { $gt: 0 }, lastPurchaseDate: { $lt: thirtyDaysAgo } }),
      Customer.find(query).sort({ totalSpent: -1 }).limit(10).select('name mobile totalOrders totalSpent lastPurchaseDate loyalty.points'),
    ]);
    res.json({ success: true, data: { total, activeCustomers: active, newCustomers, churned, retentionRate: active > 0 ? ((active - newCustomers) / active * 100).toFixed(1) : 0, topCustomers } });
  } catch (error) { next(error); }
};

exports.getSystemHealth = async (req, res, next) => {
  try {
    const [totalShops, activeShops, totalUsers, dbStatus] = await Promise.all([
      Shop.countDocuments(), Shop.countDocuments({ status: 'active' }),
      require('../models/User').countDocuments(),
      require('mongoose').connection.readyState === 1 ? 'connected' : 'disconnected',
    ]);
    res.json({ success: true, data: { totalShops, activeShops, totalUsers, database: dbStatus, uptime: process.uptime(), memory: process.memoryUsage(), timestamp: new Date() } });
  } catch (error) { next(error); }
};
