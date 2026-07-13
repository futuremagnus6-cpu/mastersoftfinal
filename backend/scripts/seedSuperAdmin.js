/**
 * Seed Super Admin
 * Creates the super admin user and a default shop if none exists.
 *
 * Usage: node scripts/seedSuperAdmin.js
 */

require('dotenv').config();
const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);
const mongoose = require('mongoose');
const User = require('../src/models/User');
const Shop = require('../src/models/Shop');
const config = require('../src/config');
const connectDB = require('../src/config/database');
const logger = require('../src/config/logger');
const { getDefaultPermissions } = require('../src/middleware/rbac');

const seedSuperAdmin = async () => {
  try {
    await connectDB();
    logger.info('Connected to MongoDB');

    const { email, password, phone } = config.superAdmin;

    // Check if super admin already exists
    const existing = await User.findOne({ email });
    if (existing) {
      logger.info(`Super admin already exists: ${email}`);
      logger.info(`Role: ${existing.role}, Active: ${existing.isActive}`);
      await mongoose.disconnect();
      return;
    }

    // Create a default shop for the super admin
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
      permissions: getDefaultPermissions('super_admin'),
    });

    logger.info(`\n✅ Super admin created successfully!`);
    logger.info(`   Email:    ${email}`);
    logger.info(`   Password: ${password}`);
    logger.info(`   Role:     ${superAdmin.role}`);
    logger.info(`   Shop:     ${defaultShop.name}`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    logger.error('Failed to seed super admin:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
};

seedSuperAdmin();
