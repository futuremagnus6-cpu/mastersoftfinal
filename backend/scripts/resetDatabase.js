/**
 * Reset Database
 * Drops ALL collections and re-seeds initial data (super admin + default shop).
 * Can also be called programmatically.
 *
 * ⚠️ WARNING: This is destructive. All data will be permanently deleted.
 *
 * Usage: node scripts/resetDatabase.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const dns = require('dns');

// DNS fix for MINGW64/Git Bash environments
dns.setServers(['8.8.8.8', '1.1.1.1']);

const config = require('../src/config');
const logger = require('../src/config/logger');
const User = require('../src/models/User');
const Shop = require('../src/models/Shop');

/**
 * Drop every collection in the current database.
 */
const dropAllCollections = async () => {
  const db = mongoose.connection.db;
  const collections = await db.listCollections().toArray();
  const names = collections.map((c) => c.name);

  if (names.length === 0) {
    logger.info('No collections to drop — database is already empty.');
    return [];
  }

  logger.warn(`Dropping ${names.length} collections: ${names.join(', ')}`);

  for (const name of names) {
    try {
      await db.dropCollection(name);
      logger.info(`  ✓ Dropped: ${name}`);
    } catch (err) {
      logger.error(`  ✗ Failed to drop ${name}: ${err.message}`);
    }
  }

  // Rebuild indexes from all registered Mongoose models
  logger.info('Rebuilding indexes...');
  await mongoose.syncIndexes();
  logger.info('Indexes rebuilt.');

  return names;
};

/**
 * Seed the super admin user and a default shop.
 */
const seedSuperAdmin = async () => {
  const { email, password, phone } = config.superAdmin;

  // Check if super admin already exists
  const existing = await User.findOne({ email });
  if (existing) {
    logger.info(`Super admin already exists: ${email} (role: ${existing.role})`);
    return;
  }

  // Create default shop
  let defaultShop = await Shop.findOne({ name: 'Future Magnus HQ' });
  if (!defaultShop) {
    defaultShop = await Shop.create({
      name: 'Future Magnus HQ',
      businessType: 'custom',
      customBusinessType: 'Corporate HQ',
      contact: {
        email: 'admin@futuremagnus.com',
        phone: '+919999999999',
      },
      address: {
        line1: 'HQ Office',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
      },
      settings: {
        currency: 'INR',
        timezone: 'Asia/Kolkata',
      },
    });
    logger.info(`Default shop created: ${defaultShop.name} (${defaultShop._id})`);
  }

  // Create super admin user
  const superAdmin = await User.create({
    name: 'Super Admin',
    email,
    password,
    phone,
    role: 'super_admin',
    shopId: defaultShop._id,
    isActive: true,
    isVerified: true,
    permissions: [
      'manage_shops', 'manage_users', 'manage_products', 'manage_orders',
      'manage_inventory', 'manage_customers', 'manage_suppliers',
      'manage_purchases', 'manage_expenses', 'manage_employees',
      'manage_subscriptions', 'manage_loyalty', 'manage_alerts',
      'manage_notifications', 'manage_reports', 'manage_analytics',
      'manage_branches', 'manage_crm', 'manage_support', 'manage_ecommerce',
      'manage_refunds', 'manage_upload', 'manage_settings', 'manage_webhooks',
      'manage_api_keys', 'manage_backups', 'manage_migrations',
      'manage_referrals', 'manage_whatsapp', 'manage_contacts',
    ],
  });

  logger.info(`\n✅ Super admin created successfully!`);
  logger.info(`   Email:    ${email}`);
  logger.info(`   Password: ${password}`);
  logger.info(`   Role:     ${superAdmin.role}`);
  logger.info(`   Shop:     ${defaultShop.name}`);
};

/**
 * Main reset function. Can be called programmatically or via CLI.
 */
const resetDatabase = async () => {
  const startTime = Date.now();

  logger.info('╔══════════════════════════════════════════╗');
  logger.info('║     DATABASE RESET — DESTRUCTIVE        ║');
  logger.info('╚══════════════════════════════════════════╝');

  try {
    logger.info('Connecting to MongoDB...');
    await mongoose.connect(config.mongodb.uri, {
      ...config.mongodb.options,
      serverSelectionTimeoutMS: 30000,
    });
    logger.info(`Connected to: ${mongoose.connection.host}`);

    // Step 1: Drop all collections
    logger.info('\n── Step 1: Dropping all collections ──');
    const dropped = await dropAllCollections();
    logger.info(`Dropped ${dropped.length} collection(s).`);

    // Step 2: Seed fresh data
    logger.info('\n── Step 2: Seeding initial data ──');
    await seedSuperAdmin();

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    logger.info(`\n✅ Database reset complete in ${elapsed}s!`);
    logger.info('   All collections dropped and re-seeded.');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    logger.error('❌ Database reset failed:', error.message);
    if (error.stack) logger.error(error.stack);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  }
};

// Run if called directly (CLI usage)
if (require.main === module) {
  resetDatabase();
}

module.exports = resetDatabase;
