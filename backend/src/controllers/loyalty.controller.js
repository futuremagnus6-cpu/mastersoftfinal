const LoyaltyTransaction = require('../models/LoyaltyTransaction');
const MembershipTier = require('../models/MembershipTier');
const Customer = require('../models/Customer');
const Shop = require('../models/Shop');
const { AppError } = require('../middleware/errorHandler');
const { scopeQuery } = require('../middleware/multiTenant');

// ─── Helper: get loyalty settings from shop ───
const getLoyaltySettings = async (shopId) => {
  if (!shopId) {
    return {
      pointsPerRupee: 1, redeemRate: 1, minRedeemPoints: 100,
      maxRedeemPercent: 50, enabled: false, pointsExpiryDays: 365,
    };
  }
  const shop = await Shop.findById(shopId).select('settings loyalty');
  const loyaltySettings = shop?.settings?.loyalty
    ? (typeof shop.settings.loyalty === 'object' ? shop.settings.loyalty : {})
    : shop?.loyalty || {};
  return {
    pointsPerRupee: loyaltySettings.pointsPerRupee ?? 1,
    redeemRate: loyaltySettings.redeemRate ?? 1,
    minRedeemPoints: loyaltySettings.minRedeemPoints ?? 100,
    maxRedeemPercent: loyaltySettings.maxRedeemPercent ?? 50,
    enabled: loyaltySettings.enabled ?? false,
    pointsExpiryDays: loyaltySettings.pointsExpiryDays ?? 365,
    ...loyaltySettings,
  };
};

// ─── Helper: get or calculate customer's current tier based on points ───
const getCustomerTier = async (shopId, lifetimePoints) => {
  const tiers = await MembershipTier.find(scopeQuery({ isActive: true }, { shopId }))
    .sort({ minPoints: -1 }) // highest first
    .lean();
  for (const tier of tiers) {
    if (lifetimePoints >= tier.minPoints) {
      return tier._id;
    }
  }
  return null;
};

// ─── Helper: update customer loyalty fields after a transaction ───
const updateCustomerLoyalty = async (customerId, shopId) => {
  // Aggregate total earned and redeemed
  const stats = await LoyaltyTransaction.aggregate([
    { $match: { customer: customerId, shopId } },
    {
      $group: {
        _id: null,
        earned: { $sum: { $cond: [{ $in: ['$type', ['earned', 'bonus', 'birthday_bonus', 'referral_bonus']] }, '$points', 0] } },
        redeemed: { $sum: { $cond: [{ $eq: ['$type', 'redeemed'] }, '$points', 0] } },
        expired: { $sum: { $cond: [{ $eq: ['$type', 'expired'] }, '$points', 0] } },
      },
    },
  ]);

  const earned = stats[0]?.earned || 0;
  const redeemed = stats[0]?.redeemed || 0;
  const expired = stats[0]?.expired || 0;
  const currentPoints = earned - redeemed - expired;

  // Get the latest transaction for balanceAfter (most accurate)
  const latestTx = await LoyaltyTransaction.findOne({ customer: customerId, shopId })
    .sort({ createdAt: -1 })
    .select('balanceAfter')
    .lean();

  const balancePoints = latestTx?.balanceAfter ?? currentPoints;
  const lifetimePoints = earned;

  // Get tier
  const tierId = await getCustomerTier(shopId, lifetimePoints);

  await Customer.findOneAndUpdate(
    { _id: customerId, shopId },
    {
      $set: {
        'loyalty.points': Math.max(0, balancePoints),
        'loyalty.lifetimePoints': lifetimePoints,
        'loyalty.tier': tierId || null,
      },
    },
    { new: true }
  );
};

// ─── Tiers ───

exports.getTiers = async (req, res, next) => {
  try {
    const tiers = await MembershipTier.find(scopeQuery({}, req)).sort({ level: 1 });
    res.json({ success: true, data: tiers });
  } catch (error) { next(error); }
};

exports.createTier = async (req, res, next) => {
  try {
    const tier = await MembershipTier.create({ ...req.body, shopId: req.shopId, createdBy: req.userId });
    res.status(201).json({ success: true, message: 'Tier created', data: tier });
  } catch (error) { next(error); }
};

exports.updateTier = async (req, res, next) => {
  try {
    const tier = await MembershipTier.findOne(scopeQuery({ _id: req.params.id }, req));
    if (!tier) throw new AppError('Tier not found', 404);
    Object.assign(tier, req.body);
    tier.updatedBy = req.userId;
    await tier.save();
    res.json({ success: true, message: 'Tier updated', data: tier });
  } catch (error) { next(error); }
};

exports.deleteTier = async (req, res, next) => {
  try {
    const tier = await MembershipTier.findOne(scopeQuery({ _id: req.params.id }, req));
    if (!tier) throw new AppError('Tier not found', 404);
    tier.isActive = false;
    tier.updatedBy = req.userId;
    await tier.save();
    res.json({ success: true, message: 'Tier deactivated' });
  } catch (error) { next(error); }
};

// ─── Transactions ───

exports.getTransactions = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, customerId, type, startDate, endDate } = req.query;
    const query = scopeQuery({}, req);
    if (customerId) query.customer = customerId;
    if (type) query.type = type;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const transactions = await LoyaltyTransaction.find(query)
      .populate('customer', 'name mobile customerId')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();

    const total = await LoyaltyTransaction.countDocuments(query);

    res.json({
      success: true,
      data: transactions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) { next(error); }
};

/**
 * POST /api/loyalty/transactions
 * Create a loyalty transaction (earn, redeem, adjust, bonus, etc.)
 * Body: { customerId, type, points, reference?, referenceId?, referenceNumber?, description? }
 */
exports.createTransaction = async (req, res, next) => {
  try {
    const { customerId, type, points, reference, referenceId, referenceNumber, description } = req.body;

    if (!customerId) throw new AppError('Customer ID is required', 400);
    if (!type) throw new AppError('Transaction type is required', 400);
    if (!points || points <= 0) throw new AppError('Points must be a positive number', 400);

    const validTypes = ['earned', 'redeemed', 'expired', 'bonus', 'birthday_bonus', 'referral_bonus', 'adjustment'];
    if (!validTypes.includes(type)) {
      throw new AppError(`Invalid type. Must be one of: ${validTypes.join(', ')}`, 400);
    }

    // Fetch customer
    const customer = await Customer.findOne(scopeQuery({ _id: customerId }, req));
    if (!customer) throw new AppError('Customer not found', 404);
    if (!customer.isActive) throw new AppError('Customer is inactive', 400);

    // Get current balance
    const balanceBefore = customer.loyalty?.points || 0;

    // For redemption, validate sufficient points
    if (type === 'redeemed' && points > balanceBefore) {
      throw new AppError(`Insufficient points. Available: ${balanceBefore}, Requested: ${points}`, 400);
    }

    // Calculate balance after
    let balanceAfter;
    const earnsPoints = ['earned', 'bonus', 'birthday_bonus', 'referral_bonus', 'adjustment'];
    if (earnsPoints.includes(type)) {
      balanceAfter = balanceBefore + points;
    } else {
      // redeemed, expired
      balanceAfter = Math.max(0, balanceBefore - points);
    }

    // Get loyalty settings snapshot
    const loyaltySettings = await getLoyaltySettings(req.shopId);

    // Calculate expiry date for earned points
    let expiresAt = null;
    if (earnsPoints.includes(type) && loyaltySettings.pointsExpiryDays > 0) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + loyaltySettings.pointsExpiryDays);
    }

    // Create the transaction
    const transaction = await LoyaltyTransaction.create({
      shopId: req.shopId,
      customer: customer._id,
      customerName: customer.name,
      customerMobile: customer.mobile,
      type,
      points: type === 'redeemed' || type === 'expired' ? points : points,
      balanceBefore,
      balanceAfter,
      loyaltySettings: {
        pointsPerRupee: loyaltySettings.pointsPerRupee,
        redeemRate: loyaltySettings.redeemRate,
        minRedeemPoints: loyaltySettings.minRedeemPoints,
        maxRedeemPercent: loyaltySettings.maxRedeemPercent,
      },
      reference: reference || type,
      referenceId: referenceId || null,
      referenceNumber: referenceNumber || null,
      description: description || '',
      expiresAt,
      createdBy: req.userId,
      createdByName: req.user?.name || 'System',
    });

    // Update customer loyalty fields
    await updateCustomerLoyalty(customer._id, req.shopId);

    res.status(201).json({
      success: true,
      message: type === 'redeemed'
        ? `${points} points redeemed`
        : `${points} points ${type === 'earned' ? 'awarded' : type}`,
      data: transaction,
      balance: balanceAfter,
    });
  } catch (error) { next(error); }
};

/**
 * GET /api/loyalty/balance/:customerId
 * Get a customer's current loyalty balance, tier, and stats
 */
exports.getCustomerBalance = async (req, res, next) => {
  try {
    const customer = await Customer.findOne(scopeQuery({ _id: req.params.customerId }, req))
      .populate('loyalty.tier', 'name benefits color')
      .lean();

    if (!customer) throw new AppError('Customer not found', 404);

    res.json({
      success: true,
      data: {
        customerId: customer._id,
        name: customer.name,
        mobile: customer.mobile,
        points: customer.loyalty?.points || 0,
        lifetimePoints: customer.loyalty?.lifetimePoints || 0,
        tier: customer.loyalty?.tier || null,
        membership: customer.membership || null,
      },
    });
  } catch (error) { next(error); }
};

/**
 * GET /api/loyalty/customer-stats/:customerId
 * Get aggregated stats for a customer's loyalty activity
 */
exports.getCustomerStats = async (req, res, next) => {
  try {
    const customer = await Customer.findOne(scopeQuery({ _id: req.params.customerId }, req))
      .select('_id name mobile loyalty')
      .lean();
    if (!customer) throw new AppError('Customer not found', 404);

    const stats = await LoyaltyTransaction.aggregate([
      { $match: { customer: customer._id, shopId: req.shopId } },
      {
        $group: {
          _id: null,
          totalEarned: { $sum: { $cond: [{ $in: ['$type', ['earned', 'bonus', 'birthday_bonus', 'referral_bonus']] }, '$points', 0] } },
          totalRedeemed: { $sum: { $cond: [{ $eq: ['$type', 'redeemed'] }, '$points', 0] } },
          totalExpired: { $sum: { $cond: [{ $eq: ['$type', 'expired'] }, '$points', 0] } },
          totalAdjustments: { $sum: { $cond: [{ $eq: ['$type', 'adjustment'] }, '$points', 0] } },
          transactionCount: { $sum: 1 },
          lastTransaction: { $max: '$createdAt' },
        },
      },
    ]);

    const s = stats[0] || { totalEarned: 0, totalRedeemed: 0, totalExpired: 0, totalAdjustments: 0, transactionCount: 0, lastTransaction: null };

    // Recent transactions (last 10)
    const recentTransactions = await LoyaltyTransaction.find({ customer: customer._id, shopId: req.shopId })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    res.json({
      success: true,
      data: {
        customerId: customer._id,
        name: customer.name,
        mobile: customer.mobile,
        currentBalance: customer.loyalty?.points || 0,
        lifetimePoints: customer.loyalty?.lifetimePoints || 0,
        totalEarned: s.totalEarned,
        totalRedeemed: s.totalRedeemed,
        totalExpired: s.totalExpired,
        totalAdjustments: s.totalAdjustments,
        netPoints: s.totalEarned - s.totalRedeemed - s.totalExpired,
        transactionCount: s.transactionCount,
        lastTransaction: s.lastTransaction,
        recentTransactions,
      },
    });
  } catch (error) { next(error); }
};

// ─── Loyalty Settings ───

exports.getSettings = async (req, res, next) => {
  try {
    const settings = await getLoyaltySettings(req.shopId);
    res.json({ success: true, data: settings });
  } catch (error) { next(error); }
};

exports.updateSettings = async (req, res, next) => {
  try {
    const shop = await Shop.findById(req.shopId);
    if (!shop) throw new AppError('Shop not found', 404);

    // Persist loyalty settings under shop.settings.loyalty
    if (!shop.settings) shop.settings = {};
    shop.settings.loyalty = {
      ...(shop.settings.loyalty || {}),
      ...req.body,
    };
    shop.updatedBy = req.userId;
    await shop.save();

    res.json({
      success: true,
      message: 'Loyalty settings updated',
      data: shop.settings.loyalty,
    });
  } catch (error) { next(error); }
};

// ─── Auto-earn points from an order (called by order controller) ───

/**
 * POST /api/loyalty/earn-from-order
 * Automatically called when an order is placed to award points to the customer.
 * Body: { customerId, orderId, orderNumber, orderTotal }
 */
exports.earnFromOrder = async (req, res, next) => {
  try {
    const { customerId, orderId, orderNumber, orderTotal } = req.body;
    if (!customerId || !orderId) throw new AppError('customerId and orderId are required', 400);

    const customer = await Customer.findOne(scopeQuery({ _id: customerId }, req));
    if (!customer) throw new AppError('Customer not found', 404);
    if (!customer.isActive) throw new AppError('Customer is inactive', 400);

    const loyaltySettings = await getLoyaltySettings(req.shopId);
    if (!loyaltySettings.enabled) {
      return res.json({ success: true, message: 'Loyalty program is disabled', pointsAwarded: 0 });
    }

    // Calculate points based on order total and settings
    const pointsPerRupee = loyaltySettings.pointsPerRupee || 1;
    const points = Math.floor(orderTotal / pointsPerRupee);

    if (points <= 0) {
      return res.json({ success: true, message: 'Order too small for points', pointsAwarded: 0 });
    }

    const balanceBefore = customer.loyalty?.points || 0;
    const balanceAfter = balanceBefore + points;

    // Check for birthday or bonus multipliers from tier
    let bonusPoints = 0;
    if (customer.loyalty?.tier) {
      const tier = await MembershipTier.findById(customer.loyalty.tier).lean();
      if (tier?.benefits?.pointsMultiplier && tier.benefits.pointsMultiplier > 1) {
        bonusPoints = Math.floor(points * (tier.benefits.pointsMultiplier - 1));
      }
    }

    const totalPoints = points + bonusPoints;

    // Calculate expiry
    let expiresAt = null;
    if (loyaltySettings.pointsExpiryDays > 0) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + loyaltySettings.pointsExpiryDays);
    }

    const transaction = await LoyaltyTransaction.create({
      shopId: req.shopId,
      customer: customer._id,
      customerName: customer.name,
      customerMobile: customer.mobile,
      type: 'earned',
      points: totalPoints,
      balanceBefore,
      balanceAfter: balanceBefore + totalPoints,
      loyaltySettings: {
        pointsPerRupee: loyaltySettings.pointsPerRupee,
        redeemRate: loyaltySettings.redeemRate,
        minRedeemPoints: loyaltySettings.minRedeemPoints,
        maxRedeemPercent: loyaltySettings.maxRedeemPercent,
      },
      reference: 'order',
      referenceId: orderId,
      referenceNumber: orderNumber,
      description: `Earned from order ${orderNumber || ''} (₹${orderTotal})`,
      expiresAt,
      createdBy: req.userId,
      createdByName: 'System',
    });

    // Update customer loyalty
    await updateCustomerLoyalty(customer._id, req.shopId);

    res.status(201).json({
      success: true,
      message: `${totalPoints} points earned from order`,
      data: transaction,
      pointsAwarded: totalPoints,
      bonusPointsAwarded: bonusPoints,
      balance: balanceBefore + totalPoints,
    });
  } catch (error) { next(error); }
};
