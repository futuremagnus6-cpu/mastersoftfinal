const mongoose = require('mongoose');
const Expense = require('../models/Expense');
const { AppError } = require('../middleware/errorHandler');
const { scopeQuery } = require('../middleware/multiTenant');

exports.getExpenses = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, category, startDate, endDate, status, search, sort: sortParam, shopId: queryShopId } = req.query;
    const query = scopeQuery({}, req);
    // Handle explicit shopId filter (for super admin filtering platform vs shop expenses)
    // Empty string = platform expenses (shopId: null), valid ObjectId = specific shop
    if (queryShopId !== undefined && !req.shopId) {
      if (queryShopId === '') {
        query.shopId = null;
      } else if (mongoose.Types.ObjectId.isValid(queryShopId)) {
        query.shopId = new mongoose.Types.ObjectId(queryShopId);
      }
    }
    if (category) query.category = category;
    if (status) query.status = status;
    if (startDate || endDate) { query.date = {}; if (startDate) query.date.$gte = new Date(startDate); if (endDate) query.date.$lte = new Date(endDate); }
    if (search) {
      query.$or = [
        { description: { $regex: search, $options: 'i' } },
        { vendor: { $regex: search, $options: 'i' } },
        { reference: { $regex: search, $options: 'i' } },
        { notes: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } },
      ];
    }
    // Parse sort parameter (e.g. '-date' -> { date: -1 })
    let sortObj = { date: -1 };
    if (sortParam) {
      const field = sortParam.replace(/^-/, '');
      const order = sortParam.startsWith('-') ? -1 : 1;
      sortObj = { [field]: order };
    }
    const expenses = await Expense.find(query)
      .populate('createdBy', 'name')
      .populate('approvedBy', 'name')
      .sort(sortObj)
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    const total = await Expense.countDocuments(query);
    const totals = await Expense.aggregate([{ $match: query }, { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }]);
    res.json({ success: true, data: expenses, totals: totals[0] || { total: 0, count: 0 }, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) } });
  } catch (error) { next(error); }
};
exports.getExpense = async (req, res, next) => {
  try {
    const expense = await Expense.findOne(scopeQuery({ _id: req.params.id }, req));
    if (!expense) throw new AppError('Expense not found', 404);
    res.json({ success: true, data: expense });
  } catch (error) { next(error); }
};
exports.createExpense = async (req, res, next) => {
  try {
    const expenseData = { ...req.body, createdBy: req.userId };
    // Only add shop/branch context if available (super admin may create platform-level expenses)
    if (req.shopId) expenseData.shopId = req.shopId;
    if (req.branchId) expenseData.branchId = req.branchId;
    const expense = await Expense.create(expenseData);
    res.status(201).json({ success: true, message: 'Expense created', data: expense });
  } catch (error) { next(error); }
};
exports.updateExpense = async (req, res, next) => {
  try {
    const expense = await Expense.findOne(scopeQuery({ _id: req.params.id }, req));
    if (!expense) throw new AppError('Expense not found', 404);
    ['category', 'subcategory', 'amount', 'description', 'date', 'paymentMethod', 'reference', 'vendor', 'notes'].forEach(f => { if (req.body[f] !== undefined) expense[f] = req.body[f]; });
    expense.updatedBy = req.userId; await expense.save();
    res.json({ success: true, message: 'Expense updated', data: expense });
  } catch (error) { next(error); }
};
exports.deleteExpense = async (req, res, next) => {
  try {
    const expense = await Expense.findOne(scopeQuery({ _id: req.params.id }, req));
    if (!expense) throw new AppError('Expense not found', 404);
    await expense.deleteOne();
    res.json({ success: true, message: 'Expense deleted' });
  } catch (error) { next(error); }
};
exports.approveExpense = async (req, res, next) => {
  try {
    const expense = await Expense.findOne(scopeQuery({ _id: req.params.id }, req));
    if (!expense) throw new AppError('Expense not found', 404);
    expense.status = 'approved'; expense.approvedBy = req.userId; expense.updatedBy = req.userId;
    await expense.save();
    res.json({ success: true, message: 'Expense approved', data: expense });
  } catch (error) { next(error); }
};
