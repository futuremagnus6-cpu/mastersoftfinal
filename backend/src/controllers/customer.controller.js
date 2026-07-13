const Customer = require('../models/Customer');
const Order = require('../models/Order');
const LoyaltyTransaction = require('../models/LoyaltyTransaction');
const { AppError } = require('../middleware/errorHandler');
const { scopeQuery } = require('../middleware/multiTenant');

// @desc    Get all customers
// @route   GET /api/customers
exports.getCustomers = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, search, tier, isActive } = req.query;
    const query = scopeQuery({}, req);

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { mobile: { $regex: search, $options: 'i' } },
        { customerId: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }
    if (tier) query['loyalty.tier'] = tier;
    if (isActive !== undefined) query.isActive = isActive === 'true';

    const customers = await Customer.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Customer.countDocuments(query);

    res.json({
      success: true,
      data: customers,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single customer
// @route   GET /api/customers/:id
exports.getCustomer = async (req, res, next) => {
  try {
    const query = scopeQuery({ _id: req.params.id }, req);
    const customer = await Customer.findOne(query);

    if (!customer) throw new AppError('Customer not found', 404);

    const orders = await Order.find(scopeQuery({ customer: customer._id }, req))
      .sort({ createdAt: -1 })
      .limit(20);

    const loyaltyTransactions = await LoyaltyTransaction.find(scopeQuery({ customer: customer._id }, req))
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({
      success: true,
      data: { ...customer.toJSON(), orders, loyaltyTransactions },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create customer
// @route   POST /api/customers
exports.createCustomer = async (req, res, next) => {
  try {
    const { name, mobile, email, gstin, pan, address, dob, anniversary, notes, creditLimit } = req.body;

    const existing = await Customer.findOne(scopeQuery({ mobile }, req));
    if (existing) throw new AppError('Customer with this mobile already exists', 409);

    const customerId = `CUST-${Date.now().toString(36).toUpperCase()}`;

    const customer = await Customer.create({
      shopId: req.shopId,
      branchId: req.branchId,
      customerId,
      name, mobile, email, gstin, pan, address,
      dob, anniversary, notes,
      creditLimit: creditLimit || 0,
      createdBy: req.userId,
    });

    res.status(201).json({ success: true, message: 'Customer created', data: customer });
  } catch (error) {
    next(error);
  }
};

// @desc    Update customer
// @route   PUT /api/customers/:id
exports.updateCustomer = async (req, res, next) => {
  try {
    const query = scopeQuery({ _id: req.params.id }, req);
    const customer = await Customer.findOne(query);
    if (!customer) throw new AppError('Customer not found', 404);

    const allowedFields = [
      'name', 'mobile', 'email', 'gstin', 'pan', 'address',
      'dob', 'anniversary', 'gender', 'notes', 'tags',
      'creditLimit', 'communication', 'taxExempted',
    ];

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) customer[field] = req.body[field];
    });

    customer.updatedBy = req.userId;
    await customer.save();

    res.json({ success: true, message: 'Customer updated', data: customer });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete customer (soft)
// @route   DELETE /api/customers/:id
exports.deleteCustomer = async (req, res, next) => {
  try {
    const query = scopeQuery({ _id: req.params.id }, req);
    const customer = await Customer.findOne(query);
    if (!customer) throw new AppError('Customer not found', 404);

    customer.isActive = false;
    customer.updatedBy = req.userId;
    await customer.save();

    res.json({ success: true, message: 'Customer deactivated' });
  } catch (error) {
    next(error);
  }
};

// @desc    Search customers (for POS)
// @route   GET /api/customers/search
exports.searchCustomers = async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q) return res.json({ success: true, data: [] });

    const query = scopeQuery({
      isActive: true,
      $or: [
        { name: { $regex: q, $options: 'i' } },
        { mobile: { $regex: q, $options: 'i' } },
        { customerId: { $regex: q, $options: 'i' } },
      ],
    }, req);

    const customers = await Customer.find(query).limit(20);
    res.json({ success: true, data: customers });
  } catch (error) {
    next(error);
  }
};

// @desc    Add loyalty points
// @route   POST /api/customers/:id/loyalty/add
exports.addLoyaltyPoints = async (req, res, next) => {
  try {
    const { points, description } = req.body;
    const query = scopeQuery({ _id: req.params.id }, req);
    const customer = await Customer.findOne(query);
    if (!customer) throw new AppError('Customer not found', 404);

    await LoyaltyTransaction.create({
      shopId: req.shopId,
      customer: customer._id,
      type: 'earned',
      points,
      balanceBefore: customer.loyalty.points,
      balanceAfter: customer.loyalty.points + points,
      description: description || 'Points added',
      createdBy: req.userId,
    });

    customer.loyalty.points += points;
    customer.loyalty.lifetimePoints += points;
    await customer.save();

    res.json({ success: true, message: `Added ${points} points`, data: customer });
  } catch (error) {
    next(error);
  }
};

// @desc    Redeem loyalty points
// @route   POST /api/customers/:id/loyalty/redeem
exports.redeemLoyaltyPoints = async (req, res, next) => {
  try {
    const { points, description } = req.body;
    const query = scopeQuery({ _id: req.params.id }, req);
    const customer = await Customer.findOne(query);
    if (!customer) throw new AppError('Customer not found', 404);
    if (customer.loyalty.points < points) throw new AppError('Insufficient points', 400);

    await LoyaltyTransaction.create({
      shopId: req.shopId,
      customer: customer._id,
      type: 'redeemed',
      points: -points,
      balanceBefore: customer.loyalty.points,
      balanceAfter: customer.loyalty.points - points,
      description: description || 'Points redeemed',
      createdBy: req.userId,
    });

    customer.loyalty.points -= points;
    await customer.save();

    res.json({ success: true, message: `Redeemed ${points} points`, data: customer });
  } catch (error) {
    next(error);
  }
};

// @desc    Record credit payment
// @route   POST /api/customers/:id/credit/pay
exports.recordCreditPayment = async (req, res, next) => {
  try {
    const { amount, reference } = req.body;
    const query = scopeQuery({ _id: req.params.id }, req);
    const customer = await Customer.findOne(query);
    if (!customer) throw new AppError('Customer not found', 404);

    customer.creditBalance = Math.max(0, customer.creditBalance - amount);
    customer.updatedBy = req.userId;
    await customer.save();

    res.json({ success: true, message: `Payment of ₹${amount} recorded`, data: customer });
  } catch (error) {
    next(error);
  }
};

module.exports = exports;
