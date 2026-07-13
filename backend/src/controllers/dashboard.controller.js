const Order = require('../models/Order');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const Expense = require('../models/Expense');
const { scopeQuery } = require('../middleware/multiTenant');

exports.getShopDashboard = async (req, res, next) => {
  try {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const baseQuery = scopeQuery({}, req);
    const [todayOrders, todayRevenue, monthOrders, monthRevenue, totalProducts, totalCustomers, lowStock, recentOrders, salesTrend, expenseTotal] = await Promise.all([
      Order.countDocuments({ ...baseQuery, createdAt: { $gte: today } }),
      Order.aggregate([{ $match: { ...baseQuery, createdAt: { $gte: today }, status: 'completed' } }, { $group: { _id: null, total: { $sum: '$grandTotal' } } }]),
      Order.countDocuments({ ...baseQuery, createdAt: { $gte: thisMonth } }),
      Order.aggregate([{ $match: { ...baseQuery, createdAt: { $gte: thisMonth }, status: 'completed' } }, { $group: { _id: null, total: { $sum: '$grandTotal' } } }]),
      Product.countDocuments({ ...baseQuery, isActive: true }),
      Customer.countDocuments({ ...baseQuery, isActive: true }),
      Product.countDocuments({ ...baseQuery, isActive: true, $expr: { $and: [{ $lte: ['$inventory.quantity', '$inventory.minStockLevel'] }, { $gt: ['$inventory.quantity', 0] }] } }),
      Order.find(baseQuery).sort({ createdAt: -1 }).limit(10).populate('customer', 'name mobile'),
      Order.aggregate([{ $match: { ...baseQuery, status: 'completed', createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } }, { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, revenue: { $sum: '$grandTotal' }, orders: { $sum: 1 } } }, { $sort: { _id: 1 } }]),
      Expense.aggregate([{ $match: { ...baseQuery, date: { $gte: thisMonth } } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
    ]);
    res.json({ success: true, data: { todayOrders, todayRevenue: todayRevenue[0]?.total || 0, monthOrders, monthRevenue: monthRevenue[0]?.total || 0, totalProducts, totalCustomers, lowStock, recentOrders, salesTrend, monthExpenses: expenseTotal[0]?.total || 0 } });
  } catch (error) { next(error); }
};

exports.getSuperAdminDashboard = async (req, res, next) => {
  try {
    const Shop = require('../models/Shop');
    const Enquiry = require('../models/Enquiry');
    const BillingTransaction = require('../models/BillingTransaction');

    // Revenue from subscription/billing payments ONLY (NOT shop orders)
    const [totalShops, activeShops, subscriptionRevenue, totalOrders, shopsByPlan, recentShops, enquiries, revenueTrend] = await Promise.all([
      Shop.countDocuments(),
      Shop.countDocuments({ status: 'active' }),
      BillingTransaction.aggregate([
        { $match: { status: 'captured' } },
        { $group: { _id: null, total: { $sum: '$amountPaid' } } },
      ]),
      Order.countDocuments(),
      Shop.aggregate([{ $group: { _id: '$subscription.status', count: { $sum: 1 } } }]),
      Shop.find().sort({ createdAt: -1 }).limit(10).select('name businessType status contact'),
      Enquiry.find().sort({ createdAt: -1 }).limit(5).select('name email message status createdAt'),
      // Real monthly revenue trend from billing transactions
      BillingTransaction.aggregate([
        { $match: { status: 'captured', paidAt: { $exists: true } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m', date: '$paidAt' } },
            revenue: { $sum: '$amountPaid' },
            transactions: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
        { $limit: 12 },
      ]),
    ]);

    res.json({
      success: true,
      data: {
        totalShops,
        activeShops,
        totalRevenue: subscriptionRevenue[0]?.total || 0,
        totalOrders,
        shopsByPlan,
        recentShops,
        enquiries,
        revenueTrend: revenueTrend || [],
      },
    });
  } catch (error) { next(error); }
};
