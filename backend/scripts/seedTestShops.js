/**
 * Seed Test Shops Script
 * Creates 3 test shops for testing the platform features including recycle bin.
 * 
 * Usage: node scripts/seedTestShops.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const config = require('../src/config');
const logger = require('../src/config/logger');

async function seedTestShops() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(config.mongodb.uri, config.mongodb.options);
    console.log('Connected to MongoDB');

    const Shop = require('../src/models/Shop');
    const Branch = require('../src/models/Branch');
    const User = require('../src/models/User');
    const { getDefaultPermissions } = require('../src/middleware/rbac');

    // Find a super admin to use as creator
    const superAdmin = await User.findOne({ role: 'super_admin' });
    if (!superAdmin) {
      console.error('No super admin found. Please run seedSuperAdmin.js first.');
      process.exit(1);
    }

    const createdBy = superAdmin._id;

    // Test Shop 1: Active trial shop (will show in Pre-Shops)
    const shop1 = await Shop.findOne({ name: 'Test Grocery Store' });
    if (!shop1) {
      const trialEnd = new Date();
      trialEnd.setDate(trialEnd.getDate() + 7);

      const s1 = await Shop.create({
        name: 'Test Grocery Store',
        businessType: 'grocery_store',
        gstin: '27AAAAA0001A1Z5',
        pan: 'AAAAA0001A',
        address: { line1: '123 Main Road', city: 'Mumbai', state: 'Maharashtra', pincode: '400001', country: 'India' },
        contact: { phone: '+919999999991', email: 'testgrocery@example.com' },
        status: 'active',
        subscription: { status: 'trial', trialEndsAt: trialEnd },
        createdBy,
      });

      const branch1 = await Branch.create({
        shopId: s1._id,
        name: 'Head Office',
        code: 'HO-TG-001',
        address: s1.address,
        contact: s1.contact,
        isHeadOffice: true,
        createdBy,
      });

      await User.create({
        shopId: s1._id,
        branchId: branch1._id,
        name: 'Test Grocery Admin',
        email: 'testgrocery@example.com',
        phone: '+919999999991',
        password: 'Test@123',
        role: 'shop_admin',
        permissions: getDefaultPermissions('shop_admin'),
        isVerified: true,
        createdBy,
      });

      console.log('✅ Created Test Shop 1: Test Grocery Store (Trial)');
    } else {
      console.log('⚠️  Test Grocery Store already exists, skipping');
    }

    // Test Shop 2: Active subscribed shop
    const shop2 = await Shop.findOne({ name: 'Test Pharmacy' });
    if (!shop2) {
      const s2 = await Shop.create({
        name: 'Test Pharmacy',
        businessType: 'pharmacy',
        gstin: '27AAAAA0002A1Z5',
        pan: 'AAAAA0002A',
        address: { line1: '456 Market Street', city: 'Pune', state: 'Maharashtra', pincode: '411001', country: 'India' },
        contact: { phone: '+919999999992', email: 'testpharmacy@example.com' },
        status: 'active',
        subscription: { status: 'active', currentPeriodStart: new Date(), currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
        createdBy,
      });

      const branch2 = await Branch.create({
        shopId: s2._id,
        name: 'Head Office',
        code: 'HO-TP-001',
        address: s2.address,
        contact: s2.contact,
        isHeadOffice: true,
        createdBy,
      });

      await User.create({
        shopId: s2._id,
        branchId: branch2._id,
        name: 'Test Pharmacy Admin',
        email: 'testpharmacy@example.com',
        phone: '+919999999992',
        password: 'Test@123',
        role: 'shop_admin',
        permissions: getDefaultPermissions('shop_admin'),
        isVerified: true,
        createdBy,
      });

      console.log('✅ Created Test Shop 2: Test Pharmacy (Active)');
    } else {
      console.log('⚠️  Test Pharmacy already exists, skipping');
    }

    // Test Shop 3: Disabled shop (will show in Recycle Bin)
    const shop3 = await Shop.findOne({ name: 'Test Electronics (Deleted)' });
    if (!shop3) {
      const s3 = await Shop.create({
        name: 'Test Electronics (Deleted)',
        businessType: 'electronics_shop',
        gstin: '27AAAAA0003A1Z5',
        pan: 'AAAAA0003A',
        address: { line1: '789 Tech Park', city: 'Bangalore', state: 'Karnataka', pincode: '560001', country: 'India' },
        contact: { phone: '+919999999993', email: 'testelectronics@example.com' },
        status: 'disabled', // This will appear in Recycle Bin
        subscription: { status: 'expired' },
        createdBy,
      });

      const branch3 = await Branch.create({
        shopId: s3._id,
        name: 'Head Office',
        code: 'HO-TE-001',
        address: s3.address,
        contact: s3.contact,
        isHeadOffice: true,
        createdBy,
      });

      await User.create({
        shopId: s3._id,
        branchId: branch3._id,
        name: 'Test Electronics Admin',
        email: 'testelectronics@example.com',
        phone: '+919999999993',
        password: 'Test@123',
        role: 'shop_admin',
        permissions: getDefaultPermissions('shop_admin'),
        isVerified: true,
        createdBy,
      });

      console.log('✅ Created Test Shop 3: Test Electronics (Deleted - in Recycle Bin)');
    } else {
      console.log('⚠️  Test Electronics (Deleted) already exists, skipping');
    }

    console.log('\n📊 Summary:');
    const totalShops = await Shop.countDocuments();
    const activeShops = await Shop.countDocuments({ status: 'active' });
    const disabledShops = await Shop.countDocuments({ status: 'disabled' });
    const trialShops = await Shop.countDocuments({ 'subscription.status': 'trial' });
    console.log(`   Total Shops: ${totalShops}`);
    console.log(`   Active Shops: ${activeShops}`);
    console.log(`   Disabled (Recycle Bin): ${disabledShops}`);
    console.log(`   Trial (Pre-Shops): ${trialShops}`);

    console.log('\n✅ Test shops seeded successfully!');
    console.log('\n📝 Shop Admin Credentials:');
    console.log('   Email: testgrocery@example.com | Password: Test@123');
    console.log('   Email: testpharmacy@example.com | Password: Test@123');
    console.log('   Email: testelectronics@example.com | Password: Test@123');

    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to seed test shops:', error.message);
    process.exit(1);
  }
}

seedTestShops();
