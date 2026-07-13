/**
 * Activate Super Admin
 * Usage: node scripts/activateSuperAdmin.js
 */
require('dotenv').config();
const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);
const mongoose = require('mongoose');
const config = require('../src/config');
const connectDB = require('../src/config/database');
const logger = require('../src/config/logger');

const activate = async () => {
  try {
    await connectDB();
    logger.info('Connected to MongoDB');

    const User = require('../src/models/User');
    const result = await User.updateOne(
      { email: config.superAdmin.email },
      { $set: { isActive: true, isVerified: true } }
    );

    logger.info(`Matched: ${result.matchedCount}, Modified: ${result.modifiedCount}`);

    const user = await User.findOne({ email: config.superAdmin.email }).select('email role isActive isVerified');
    if (user) {
      logger.info(`User: ${user.email}, Role: ${user.role}, Active: ${user.isActive}, Verified: ${user.isVerified}`);
    } else {
      logger.error('Super admin user not found!');
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    logger.error('Failed:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
};

activate();
