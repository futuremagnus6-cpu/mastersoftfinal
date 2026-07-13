/**
 * Test Setup — connects to MongoDB, exports the Express app,
 * and provides helper utilities used across all test suites.
 */

// Force test environment before any module loads
process.env.NODE_ENV = 'test';

const { app } = require('../../server');
const config = require('../../src/config');
const connectDB = require('../../src/config/database');
const mongoose = require('mongoose');
const request = require('supertest');

/**
 * Connect to the database before all tests in a suite.
 * Uses the existing local MongoDB connection from config.
 */
beforeAll(async () => {
  // connectDB has its own retry logic — await it once
  await connectDB();
}, 15000);

/**
 * Close all DB connections after the suite finishes.
 * This prevents Jest from hanging on open handles.
 */
afterAll(async () => {
  await mongoose.disconnect();
}, 10000);

/**
 * Authenticate as the seeded super admin and return a usable auth token.
 *
 * @returns {Promise<string>} JWT bearer token
 */
const getSuperAdminToken = async () => {
  const res = await request(app)
    .post('/api/auth/login')
    .send({
      email: config.superAdmin.email,
      password: config.superAdmin.password,
    });

  if (!res.body.success) {
    throw new Error(
      `Super admin login failed: ${res.body.message}. ` +
      'Make sure the seed script ran: node backend/scripts/seedSuperAdmin.js'
    );
  }

  return res.body.token;
};

module.exports = { app, getSuperAdminToken };
