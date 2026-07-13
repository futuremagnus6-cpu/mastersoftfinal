const Referral = require('../models/Referral');
const Customer = require('../models/Customer');
const { AppError } = require('../middleware/errorHandler');
const { scopeQuery } = require('../middleware/multiTenant');
const crypto = require('crypto');

exports.getReferrals = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, status, source, startDate, endDate } = req.query;
    const query = scopeQuery({}, req);
    if (status) query.status = status;
    if (source) query.source = source;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }
    const referrals = await Referral.find(query)
      .populate('referrer', 'name phone email')
      .populate('referredCustomer', 'name phone email')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    const total = await Referral.countDocuments(query);
    const stats = await Referral.aggregate([
      { $match: query },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    res.json({
      success: true,
      data: referrals,
      stats,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) },
    });
  } catch (error) { next(error); }
};

exports.getReferral = async (req, res, next) => {
  try {
    const referral = await Referral.findOne(scopeQuery({ _id: req.params.id }, req))
      .populate('referrer', 'name phone email')
      .populate('referredCustomer', 'name phone email')
      .populate('createdBy', 'name');
    if (!referral) throw new AppError('Referral not found', 404);
    res.json({ success: true, data: referral });
  } catch (error) { next(error); }
};

exports.createReferral = async (req, res, next) => {
  try {
    const referrer = await Customer.findOne(scopeQuery({ _id: req.body.referrer }, req));
    if (!referrer) throw new AppError('Referrer customer not found', 404);

    const referralCode = `${referrer.name.slice(0, 3).toUpperCase()}${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const referral = await Referral.create({
      ...req.body,
      shopId: req.shopId,
      referralCode,
      createdBy: req.userId,
    });
    res.status(201).json({ success: true, message: 'Referral created', data: referral });
  } catch (error) { next(error); }
};

exports.updateReferral = async (req, res, next) => {
  try {
    const referral = await Referral.findOne(scopeQuery({ _id: req.params.id }, req));
    if (!referral) throw new AppError('Referral not found', 404);
    ['status', 'rewardValue', 'referrerReward', 'referredReward', 'notes'].forEach(f => {
      if (req.body[f] !== undefined) referral[f] = req.body[f];
    });
    if (req.body.status === 'rewarded' && !referral.rewardedAt) {
      referral.rewardedAt = new Date();
      referral.referrerRewarded = true;
      referral.referredRewarded = true;
    }
    referral.updatedBy = req.userId;
    await referral.save();
    res.json({ success: true, message: 'Referral updated', data: referral });
  } catch (error) { next(error); }
};

exports.deleteReferral = async (req, res, next) => {
  try {
    const referral = await Referral.findOne(scopeQuery({ _id: req.params.id }, req));
    if (!referral) throw new AppError('Referral not found', 404);
    await referral.deleteOne();
    res.json({ success: true, message: 'Referral deleted' });
  } catch (error) { next(error); }
};

exports.getReferralStats = async (req, res, next) => {
  try {
    const query = scopeQuery({}, req);
    const stats = await Referral.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalReferrals: { $sum: 1 },
          convertedReferrals: { $sum: { $cond: [{ $in: ['$status', ['purchased', 'rewarded']] }, 1, 0] } },
          totalRewards: { $sum: '$referrerReward' },
          averageReward: { $avg: '$referrerReward' },
        },
      },
    ]);
    res.json({
      success: true,
      data: stats[0] || { totalReferrals: 0, convertedReferrals: 0, totalRewards: 0, averageReward: 0 },
    });
  } catch (error) { next(error); }
};
