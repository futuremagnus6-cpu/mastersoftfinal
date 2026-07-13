/**
 * Feature-Enforcement Middleware
 *
 * Verifies that the authenticated user's shop subscription plan includes
 * the required feature before allowing the request to proceed.
 *
 * This is the BACKEND enforcement layer — the frontend already hides
 * features via ShopRoute and getEnabledMenuItems. This middleware
 * ensures API-level enforcement so even if someone calls the API
 * directly, they can't use features their plan doesn't include.
 *
 * Usage:
 *   router.get('/some-feature', requireFeature('pos'), handler);
 *   router.post('/products', requireFeature('inventory'), handler);
 */

const Shop = require('../models/Shop');

// Cache shop features per request to avoid repeated DB queries
const FEATURE_CACHE = new WeakMap();

/**
 * Middleware that checks if the current shop has a specific feature enabled.
 * @param {string} featureKey - The feature key to check (e.g., 'pos', 'inventory', 'crm')
 * @returns {Function} Express middleware
 */
const requireFeature = (featureKey) => {
  return async (req, res, next) => {
    try {
      // Super admin bypasses all feature checks
      if (req.user && req.user.role === 'super_admin') {
        return next();
      }

      // If no shop context, skip feature check (will be caught by auth middleware)
      if (!req.shopId && !req.user?.shopId) {
        return next();
      }

      const shopId = req.shopId || req.user?.shopId;

      // Check cache first
      if (FEATURE_CACHE.has(req)) {
        const cached = FEATURE_CACHE.get(req);
        if (cached[featureKey] === true) return next();
        return res.status(403).json({
          success: false,
          message: `The "${featureKey}" feature is not included in your subscription plan. Please upgrade to access this feature.`,
          code: 'FEATURE_NOT_AVAILABLE',
          requiredFeature: featureKey,
        });
      }

      // Fetch shop with features
      const shop = await Shop.findById(shopId)
        .select('features subscription.status subscription.trialEndsAt subscription.currentPeriodEnd')
        .lean();

      if (!shop) {
        return res.status(404).json({
          success: false,
          message: 'Shop not found.',
          code: 'SHOP_NOT_FOUND',
        });
      }

      const now = new Date();
      const subStatus = shop.subscription?.status;

      if (subStatus === 'trial' && shop.subscription?.trialEndsAt && new Date(shop.subscription.trialEndsAt) < now) {
        await Shop.updateOne({ _id: shopId }, { 'subscription.status': 'expired' });
        return res.status(403).json({
          success: false,
          message: 'Your trial has expired. Please subscribe to continue using features.',
          code: 'SUBSCRIPTION_EXPIRED',
        });
      }

      if (subStatus === 'active' && shop.subscription?.currentPeriodEnd && new Date(shop.subscription.currentPeriodEnd) < now) {
        await Shop.updateOne({ _id: shopId }, { 'subscription.status': 'expired', 'subscription.autoRenew': false });
        return res.status(403).json({
          success: false,
          message: 'Your subscription has expired. Please renew to continue using features.',
          code: 'SUBSCRIPTION_EXPIRED',
        });
      }

      // Check subscription is active or in trial
      if (subStatus === 'expired' || subStatus === 'suspended' || subStatus === 'cancelled') {
        return res.status(403).json({
          success: false,
          message: 'Your subscription has expired. Please renew to continue using features.',
          code: 'SUBSCRIPTION_EXPIRED',
        });
      }

      // Cache features for subsequent checks in this request
      FEATURE_CACHE.set(req, shop.features || {});

      // Check if the feature is enabled
      const features = shop.features || {};
      if (features[featureKey] !== true) {
        return res.status(403).json({
          success: false,
          message: `The "${featureKey}" feature is not included in your subscription plan. Please upgrade to access this feature.`,
          code: 'FEATURE_NOT_AVAILABLE',
          requiredFeature: featureKey,
        });
      }

      next();
    } catch (error) {
      // If we can't check features (e.g., DB error), allow the request
      // but log the error for investigation
      console.error('Feature check error:', error.message);
      next();
    }
  };
};

module.exports = { requireFeature };
