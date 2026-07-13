const ApiKey = require('../models/ApiKey');
const { AppError } = require('../middleware/errorHandler');
const { scopeQuery } = require('../middleware/multiTenant');

exports.getApiKeys = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, isActive } = req.query;
    const query = scopeQuery({}, req);
    if (isActive !== undefined) query.isActive = isActive === 'true';
    const apiKeys = await ApiKey.find(query)
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    const total = await ApiKey.countDocuments(query);
    // Mask keys for security
    const maskedKeys = apiKeys.map(k => ({
      ...k.toObject(),
      key: k.maskKey(),
    }));
    res.json({
      success: true,
      data: maskedKeys,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) },
    });
  } catch (error) { next(error); }
};

exports.getApiKey = async (req, res, next) => {
  try {
    const apiKey = await ApiKey.findOne(scopeQuery({ _id: req.params.id }, req))
      .populate('createdBy', 'name')
      .populate('updatedBy', 'name');
    if (!apiKey) throw new AppError('API key not found', 404);
    const data = apiKey.toObject();
    data.key = apiKey.maskKey();
    res.json({ success: true, data });
  } catch (error) { next(error); }
};

exports.createApiKey = async (req, res, next) => {
  try {
    const apiKey = await ApiKey.create({
      ...req.body,
      shopId: req.shopId,
      createdBy: req.userId,
    });
    // Return full key on creation (only time it's visible)
    res.status(201).json({
      success: true,
      message: 'API key created. Save the key now — it will not be shown again.',
      data: apiKey,
    });
  } catch (error) { next(error); }
};

exports.updateApiKey = async (req, res, next) => {
  try {
    const apiKey = await ApiKey.findOne(scopeQuery({ _id: req.params.id }, req));
    if (!apiKey) throw new AppError('API key not found', 404);
    ['name', 'permissions', 'scopes', 'allowedIps', 'isActive', 'expiresAt'].forEach(f => {
      if (req.body[f] !== undefined) apiKey[f] = req.body[f];
    });
    apiKey.updatedBy = req.userId;
    await apiKey.save();
    const data = apiKey.toObject();
    data.key = apiKey.maskKey();
    res.json({ success: true, message: 'API key updated', data });
  } catch (error) { next(error); }
};

exports.deleteApiKey = async (req, res, next) => {
  try {
    const apiKey = await ApiKey.findOne(scopeQuery({ _id: req.params.id }, req));
    if (!apiKey) throw new AppError('API key not found', 404);
    await apiKey.deleteOne();
    res.json({ success: true, message: 'API key deleted' });
  } catch (error) { next(error); }
};

exports.regenerateApiKey = async (req, res, next) => {
  try {
    const apiKey = await ApiKey.findOne(scopeQuery({ _id: req.params.id }, req));
    if (!apiKey) throw new AppError('API key not found', 404);
    const crypto = require('crypto');
    const prefix = 'mag_';
    apiKey.key = `${prefix}${crypto.randomBytes(32).toString('hex')}`;
    apiKey.prefix = prefix;
    apiKey.updatedBy = req.userId;
    await apiKey.save();
    res.json({
      success: true,
      message: 'API key regenerated. Save the new key — it will not be shown again.',
      data: apiKey,
    });
  } catch (error) { next(error); }
};
