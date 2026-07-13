/**
 * Multi-Tenant Middleware
 *
 * Ensures complete data isolation between shops.
 * Every query is scoped to the current shopId.
 */

const mongoose = require('mongoose');

/**
 * Extract a clean ObjectId from various shopId formats.
 * Handles: ObjectId instances, populated objects with _id, and plain strings.
 * @param {*} id - Raw shopId value
 * @returns {mongoose.Types.ObjectId|null} Clean ObjectId or null
 */
const getCleanShopId = (id) => {
  if (!id) return null;
  // If it's already an ObjectId instance, return directly
  if (id instanceof mongoose.Types.ObjectId) return id;
  // If it's a populated object with _id (e.g. from .populate())
  if (typeof id === 'object' && id._id) {
    return id._id instanceof mongoose.Types.ObjectId
      ? id._id
      : new mongoose.Types.ObjectId(String(id._id));
  }
  // If it's a string, cast it
  if (typeof id === 'string' && mongoose.Types.ObjectId.isValid(id)) {
    return new mongoose.Types.ObjectId(id);
  }
  return id; // fallback — return as-is
};

const multiTenant = (req, res, next) => {
  // Super admin can access all shops or specify a shop
  if (req.user && req.user.role === 'super_admin') {
    const shopId = req.headers['x-shop-id'] || req.params.shopId || req.query.shopId;
    if (shopId) {
      req.shopId = getCleanShopId(shopId);
    }
    next();
    return;
  }

  // Other users must have a shopId
  if (!req.user || !req.user.shopId) {
    return res.status(403).json({
      success: false,
      message: 'No shop context found. Multi-tenant access denied.',
    });
  }

  req.shopId = getCleanShopId(req.user.shopId);
  req.branchId = req.headers['x-branch-id'] || req.user.branchId || null;

  next();
};

/**
 * Scopes a MongoDB query to the current shop
 * @param {Object} query - The query object to scope
 * @param {Object} req - The request object
 * @returns {Object} Scoped query
 */
const scopeQuery = (query = {}, req) => {
  if (req.shopId) {
    query.shopId = getCleanShopId(req.shopId);
  }
  return query;
};

/**
 * Scopes aggregation pipeline to current shop
 * @param {Array} pipeline - Aggregation pipeline
 * @param {Object} req - Request object
 * @returns {Array} Scoped pipeline
 */
const scopePipeline = (pipeline, req) => {
  if (req.shopId) {
    pipeline.unshift({ $match: { shopId: getCleanShopId(req.shopId) } });
  }
  return pipeline;
};

module.exports = { multiTenant, scopeQuery, scopePipeline, getCleanShopId };
