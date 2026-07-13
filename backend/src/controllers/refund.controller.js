const Return = require('../models/Return');
const Order = require('../models/Order');
const { AppError } = require('../middleware/errorHandler');
const { scopeQuery } = require('../middleware/multiTenant');

exports.getReturns = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, status, refundStatus, startDate, endDate } = req.query;
    const query = scopeQuery({}, req);
    if (status) query.status = status;
    if (refundStatus) query.refundStatus = refundStatus;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }
    const returns = await Return.find(query)
      .populate('order', 'orderNumber total')
      .populate('customer', 'name phone')
      .populate('createdBy', 'name')
      .populate('approvedBy', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    const total = await Return.countDocuments(query);
    res.json({
      success: true,
      data: returns,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) },
    });
  } catch (error) { next(error); }
};

exports.getReturn = async (req, res, next) => {
  try {
    const ret = await Return.findOne(scopeQuery({ _id: req.params.id }, req))
      .populate('order', 'orderNumber total')
      .populate('customer', 'name phone email')
      .populate('items.product', 'name sku')
      .populate('createdBy', 'name')
      .populate('approvedBy', 'name')
      .populate('processedBy', 'name');
    if (!ret) throw new AppError('Return not found', 404);
    res.json({ success: true, data: ret });
  } catch (error) { next(error); }
};

exports.createReturn = async (req, res, next) => {
  try {
    const order = await Order.findOne(scopeQuery({ _id: req.body.order }, req));
    if (!order) throw new AppError('Order not found', 404);

    const returnData = {
      ...req.body,
      shopId: req.shopId,
      branchId: req.branchId,
      returnNumber: `RTRN-${Date.now()}`,
      createdBy: req.userId,
    };
    const ret = await Return.create(returnData);
    res.status(201).json({ success: true, message: 'Return created', data: ret });
  } catch (error) { next(error); }
};

exports.updateReturn = async (req, res, next) => {
  try {
    const ret = await Return.findOne(scopeQuery({ _id: req.params.id }, req));
    if (!ret) throw new AppError('Return not found', 404);
    ['status', 'refundStatus', 'refundMethod', 'notes', 'items', 'totalRefundAmount'].forEach(f => {
      if (req.body[f] !== undefined) ret[f] = req.body[f];
    });
    ret.updatedBy = req.userId;
    await ret.save();
    res.json({ success: true, message: 'Return updated', data: ret });
  } catch (error) { next(error); }
};

exports.deleteReturn = async (req, res, next) => {
  try {
    const ret = await Return.findOne(scopeQuery({ _id: req.params.id }, req));
    if (!ret) throw new AppError('Return not found', 404);
    await ret.deleteOne();
    res.json({ success: true, message: 'Return deleted' });
  } catch (error) { next(error); }
};

exports.approveReturn = async (req, res, next) => {
  try {
    const ret = await Return.findOne(scopeQuery({ _id: req.params.id }, req));
    if (!ret) throw new AppError('Return not found', 404);
    ret.status = 'approved';
    ret.refundStatus = 'approved';
    ret.approvedBy = req.userId;
    ret.updatedBy = req.userId;
    await ret.save();
    res.json({ success: true, message: 'Return approved', data: ret });
  } catch (error) { next(error); }
};

exports.processReturn = async (req, res, next) => {
  try {
    const ret = await Return.findOne(scopeQuery({ _id: req.params.id }, req));
    if (!ret) throw new AppError('Return not found', 404);
    ret.status = 'completed';
    ret.refundStatus = 'processed';
    ret.processedBy = req.userId;
    ret.updatedBy = req.userId;
    await ret.save();
    res.json({ success: true, message: 'Return processed', data: ret });
  } catch (error) { next(error); }
};

exports.rejectReturn = async (req, res, next) => {
  try {
    const ret = await Return.findOne(scopeQuery({ _id: req.params.id }, req));
    if (!ret) throw new AppError('Return not found', 404);
    ret.status = 'rejected';
    ret.refundStatus = 'rejected';
    ret.notes = req.body.reason || ret.notes;
    ret.updatedBy = req.userId;
    await ret.save();
    res.json({ success: true, message: 'Return rejected', data: ret });
  } catch (error) { next(error); }
};
