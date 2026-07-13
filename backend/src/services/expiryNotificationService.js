const cron = require('node-cron');
const Shop = require('../models/Shop');
const User = require('../models/User');
const logger = require('../config/logger');
const emailService = require('./emailService');

// Track which notifications have been sent to avoid duplicates
const notificationCache = new Map();

/**
 * Check for shops with trials expiring soon and send reminder emails.
 * Runs daily at 8:00 AM.
 */
const setupTrialExpiryCheck = () => {
  cron.schedule('0 8 * * *', async () => {
    logger.info('[ExpiryNotification] Running trial expiry check...');
    try {
      const now = new Date();
      const checkWindows = [
        { days: 7, label: '7_days' },
        { days: 3, label: '3_days' },
        { days: 1, label: '1_day' },
      ];

      for (const window of checkWindows) {
        const targetDate = new Date(now);
        targetDate.setDate(targetDate.getDate() + window.days);
        
        // Find shops whose trial ends exactly on the target date
        const startOfDay = new Date(targetDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(targetDate);
        endOfDay.setHours(23, 59, 59, 999);

        const expiringShops = await Shop.find({
          'subscription.status': 'trial',
          'subscription.trialEndsAt': { $gte: startOfDay, $lte: endOfDay },
          status: { $ne: 'disabled' },
        });

        for (const shop of expiringShops) {
          const cacheKey = `${shop._id}_trial_${window.label}`;
          if (notificationCache.has(cacheKey)) continue;

          try {
            const shopAdmin = await User.findOne({ shopId: shop._id, role: 'shop_admin' });
            if (shopAdmin) {
              const formattedDate = shop.subscription.trialEndsAt
                ? shop.subscription.trialEndsAt.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
                : 'Today';
              
              await emailService.sendTrialExpiryWarning(
                shopAdmin.email,
                shopAdmin.name,
                shop.name,
                formattedDate,
                window.days
              );
              
              notificationCache.set(cacheKey, true);
              logger.info(`[ExpiryNotification] Sent trial expiry warning (${window.label}) to ${shopAdmin.email} for shop ${shop.name}`);
            }
          } catch (err) {
            logger.error(`[ExpiryNotification] Failed to send trial warning for shop ${shop.name}: ${err.message}`);
          }
        }
      }
    } catch (error) {
      logger.error(`[ExpiryNotification] Trial expiry check failed: ${error.message}`);
    }
  });
};

/**
 * Check for paid subscriptions expiring soon and send reminder emails DAILY when within 7 days.
 * Also checks for already-expired subscriptions.
 * Runs daily at 9:00 AM.
 */
const setupSubscriptionExpiryCheck = () => {
  cron.schedule('0 9 * * *', async () => {
    logger.info('[ExpiryNotification] Running subscription expiry check...');
    try {
      const now = new Date();
      
      // Find all active shops with subscriptions expiring within 14 days
      const reminderEnd = new Date(now);
      reminderEnd.setDate(reminderEnd.getDate() + 14);
      reminderEnd.setHours(23, 59, 59, 999);

      const expiringShops = await Shop.find({
        'subscription.status': 'active',
        'subscription.currentPeriodEnd': { 
          $gte: now, 
          $lte: reminderEnd 
        },
        status: { $ne: 'disabled' },
      }).populate('subscription.plan', 'name');

      for (const shop of expiringShops) {
        const daysRemaining = Math.ceil((shop.subscription.currentPeriodEnd - now) / (1000 * 60 * 60 * 24));
        
        // Use date-based cache key so it sends once per day per shop
        const todayKey = `${shop._id}_sub_${now.toISOString().split('T')[0]}`;
        if (notificationCache.has(todayKey)) continue;
        
        // If more than 7 days remaining, only send at the 14-day mark
        if (daysRemaining > 7) {
          if (daysRemaining !== 14 && daysRemaining !== 13) continue;
          // Send when it's exactly 14 or 13 days remaining (give a small window)
        }
        // If within 7 days, send daily (the date-based cache key handles this)

        try {
          const shopAdmin = await User.findOne({ shopId: shop._id, role: 'shop_admin' });
          if (shopAdmin) {
            const formattedDate = shop.subscription.currentPeriodEnd
              ? shop.subscription.currentPeriodEnd.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
              : 'Today';
            
            await emailService.sendSubscriptionExpiryWarning(
              shopAdmin.email,
              shopAdmin.name,
              shop.name,
              shop.subscription.plan?.name || 'Current Plan',
              formattedDate,
              daysRemaining
            );
            
            notificationCache.set(todayKey, true);
            logger.info(`[ExpiryNotification] Sent subscription expiry warning (${daysRemaining} days left) to ${shopAdmin.email} for shop ${shop.name}`);
          }
        } catch (err) {
          logger.error(`[ExpiryNotification] Failed to send subscription warning for shop ${shop.name}: ${err.message}`);
        }
      }

      // Check for already-expired subscriptions
      const expiredShops = await Shop.find({
        $or: [
          { 'subscription.status': 'trial', 'subscription.trialEndsAt': { $lt: now } },
          { 'subscription.status': 'active', 'subscription.currentPeriodEnd': { $lt: now } },
        ],
        status: { $ne: 'disabled' },
      });

      for (const shop of expiredShops) {
        const cacheKey = `${shop._id}_expired`;
        if (notificationCache.has(cacheKey)) continue;

        try {
          // Mark subscription as expired
          shop.subscription.status = shop.subscription.status === 'trial' ? 'expired' : 'expired';
          await shop.save();

          const shopAdmin = await User.findOne({ shopId: shop._id, role: 'shop_admin' });
          if (shopAdmin) {
            const formattedDate = shop.subscription.trialEndsAt || shop.subscription.currentPeriodEnd;
            const dateStr = formattedDate
              ? formattedDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
              : 'Unknown';
            
            await emailService.sendSubscriptionExpiryWarning(
              shopAdmin.email,
              shopAdmin.name,
              shop.name,
              'Previous Plan',
              dateStr,
              0
            );
            
            notificationCache.set(cacheKey, true);
            logger.info(`[ExpiryNotification] Marked shop ${shop.name} as expired and notified admin`);
          }
        } catch (err) {
          logger.error(`[ExpiryNotification] Failed to process expired shop ${shop.name}: ${err.message}`);
        }
      }
    } catch (error) {
      logger.error(`[ExpiryNotification] Subscription expiry check failed: ${error.message}`);
    }
  });
};

/**
 * Initialize all expiry notification cron jobs.
 */
const initExpiryNotifications = () => {
  logger.info('[ExpiryNotification] Initializing expiry notification cron jobs...');
  setupTrialExpiryCheck();
  setupSubscriptionExpiryCheck();
  logger.info('[ExpiryNotification] Expiry notification cron jobs scheduled.');
  
  // Clear notification cache every day at midnight to allow re-notification if needed
  cron.schedule('0 0 * * *', () => {
    logger.info('[ExpiryNotification] Clearing notification cache...');
    notificationCache.clear();
  });
};

module.exports = { initExpiryNotifications };
