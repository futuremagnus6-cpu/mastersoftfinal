const Webhook = require('../models/Webhook');
const { AppError } = require('../middleware/errorHandler');
const { scopeQuery } = require('../middleware/multiTenant');

exports.getWebhooks = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, isActive } = req.query;
    const query = scopeQuery({}, req);
    if (isActive !== undefined) query.isActive = isActive === 'true';
    const webhooks = await Webhook.find(query)
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    const total = await Webhook.countDocuments(query);
    res.json({
      success: true,
      data: webhooks,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) },
    });
  } catch (error) { next(error); }
};

exports.getWebhook = async (req, res, next) => {
  try {
    const webhook = await Webhook.findOne(scopeQuery({ _id: req.params.id }, req))
      .populate('createdBy', 'name')
      .populate('updatedBy', 'name');
    if (!webhook) throw new AppError('Webhook not found', 404);
    res.json({ success: true, data: webhook });
  } catch (error) { next(error); }
};

exports.createWebhook = async (req, res, next) => {
  try {
    const webhook = await Webhook.create({
      ...req.body,
      shopId: req.shopId,
      createdBy: req.userId,
    });
    res.status(201).json({ success: true, message: 'Webhook created', data: webhook });
  } catch (error) { next(error); }
};

exports.updateWebhook = async (req, res, next) => {
  try {
    const webhook = await Webhook.findOne(scopeQuery({ _id: req.params.id }, req));
    if (!webhook) throw new AppError('Webhook not found', 404);
    ['name', 'url', 'events', 'isActive', 'retryCount', 'timeout', 'headers'].forEach(f => {
      if (req.body[f] !== undefined) webhook[f] = req.body[f];
    });
    webhook.updatedBy = req.userId;
    await webhook.save();
    res.json({ success: true, message: 'Webhook updated', data: webhook });
  } catch (error) { next(error); }
};

exports.deleteWebhook = async (req, res, next) => {
  try {
    const webhook = await Webhook.findOne(scopeQuery({ _id: req.params.id }, req));
    if (!webhook) throw new AppError('Webhook not found', 404);
    await webhook.deleteOne();
    res.json({ success: true, message: 'Webhook deleted' });
  } catch (error) { next(error); }
};

exports.toggleWebhook = async (req, res, next) => {
  try {
    const webhook = await Webhook.findOne(scopeQuery({ _id: req.params.id }, req));
    if (!webhook) throw new AppError('Webhook not found', 404);
    webhook.isActive = !webhook.isActive;
    webhook.updatedBy = req.userId;
    await webhook.save();
    res.json({ success: true, message: `Webhook ${webhook.isActive ? 'activated' : 'deactivated'}`, data: webhook });
  } catch (error) { next(error); }
};

exports.testWebhook = async (req, res, next) => {
  try {
    const webhook = await Webhook.findOne(scopeQuery({ _id: req.params.id }, req));
    if (!webhook) throw new AppError('Webhook not found', 404);
    // Send a test payload to the webhook URL
    const axios = require('axios');
    const payload = { test: true, event: 'test', timestamp: new Date().toISOString() };
    try {
      const response = await axios.post(webhook.url, payload, {
        headers: { 'Content-Type': 'application/json', 'X-Webhook-Secret': webhook.secret, 'X-Event-Type': 'test' },
        timeout: webhook.timeout || 5000,
      });
      webhook.lastTriggeredAt = new Date();
      webhook.lastResponse = response.status;
      webhook.lastError = null;
      await webhook.save();
      res.json({ success: true, message: 'Test webhook sent', data: { statusCode: response.status } });
    } catch (axiosError) {
      webhook.lastResponse = axiosError.response?.status || 0;
      webhook.lastError = axiosError.message;
      await webhook.save();
      res.json({ success: false, message: 'Webhook test failed', data: { error: axiosError.message } });
    }
  } catch (error) { next(error); }
};
