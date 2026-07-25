/**
 * Seed Subscription Plans
 * Creates the two subscription plans for the billing page:
 *   1. Monthly Plan — ₹700/month (all features)
 *   2. Yearly Plan  — ₹7,000/year (all features)
 *
 * Usage: node scripts/seedPlans.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const config = require('../src/config');
const logger = require('../src/config/logger');

const ALL_FEATURES = {
  pos: true,
  inventory: true,
  crm: true,
  suppliers: true,
  purchases: true,
  expenses: true,
  employees: true,
  multiBranch: true,
  loyalty: true,
  ecommerce: true,
  customerPortal: true,
  barcodeScanner: true,
  thermalPrinter: true,
  whatsappNotifications: true,
  emailNotifications: true,
  lowStockAlerts: true,
  expiryAlerts: true,
  gstModule: true,
  apiAccess: true,
  referralSystem: true,
  affiliateSystem: true,
  aiForecasting: true,
  customerSupport: true,
  darkMode: true,
  multiLanguage: true,
  autoBackup: true,
  offlinePos: true,
};

const ALL_LIMITS = {
  maxUsers: 9999,
  maxProducts: 999999,
  maxBranches: 999,
  maxStorage: 9999,
};

async function seedPlans() {
  try {
    logger.info('Connecting to MongoDB...');
    await mongoose.connect(config.mongodb.uri, config.mongodb.options);
    logger.info('Connected to MongoDB');

    const SubscriptionPlan = require('../src/models/SubscriptionPlan');

    // ── Plan 1: Monthly Plan — ₹700/month ──
    const existingMonthly = await SubscriptionPlan.findOne({ name: 'Monthly Plan' });
    if (!existingMonthly) {
      await SubscriptionPlan.create({
        name: 'Monthly Plan',
        description: 'Pay month-to-month with full access to all features. Cancel anytime.',
        monthlyPrice: 700,
        trialPeriod: 0,
        sortOrder: 1,
        isActive: true,
        features: { ...ALL_FEATURES },
        limits: { ...ALL_LIMITS },
        supportLevel: 'dedicated',
        apiAccess: true,
        whiteLabel: true,
      });
      logger.info('✅ Created plan: Monthly Plan — ₹700/month');
    } else {
      logger.info('⚠️  Monthly Plan already exists, skipping');
    }

    // ── Plan 2: Yearly Plan — ₹7,000/year ──
    const existingYearly = await SubscriptionPlan.findOne({ name: 'Yearly Plan' });
    if (!existingYearly) {
      await SubscriptionPlan.create({
        name: 'Yearly Plan',
        description: 'Best value — pay ₹7,000 once for the full year. All features included.',
        monthlyPrice: 700,
        annualPrice: 7000,
        trialPeriod: 0,
        sortOrder: 2,
        isActive: true,
        features: { ...ALL_FEATURES },
        limits: { ...ALL_LIMITS },
        supportLevel: 'dedicated',
        apiAccess: true,
        whiteLabel: true,
      });
      logger.info('✅ Created plan: Yearly Plan — ₹7,000/year');
    } else {
      logger.info('⚠️  Yearly Plan already exists, skipping');
    }

    // Verify
    const count = await SubscriptionPlan.countDocuments({ isActive: true });
    const plans = await SubscriptionPlan.find({ isActive: true }).sort({ sortOrder: 1 }).lean();
    logger.info(`\n📊 Total active plans: ${count}`);
    plans.forEach(p => {
      logger.info(`   • ${p.name}: ₹${p.monthlyPrice}/mo | Annual: ₹${p.annualPrice || 'N/A'}/yr | Features: ${Object.values(p.features || {}).filter(Boolean).length}`);
    });

    logger.info('\n✅ Plans seeded successfully!');
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    logger.error('❌ Failed to seed plans:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

seedPlans();
