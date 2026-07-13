/**
 * ⚠️ DESTRUCTIVE SCRIPT ⚠️
 *
 * Cleanup All Shops — removes ALL shops and their associated data,
 * keeping only the super admin user account.
 *
 * Usage:
 *   node backend/scripts/cleanupAllShops.js
 *
 * WARNING: This will permanently delete:
 *   - All shops and their configurations
 *   - All products, orders, customers, suppliers
 *   - All users (shop admins, managers, staff)
 *   - All expenses, purchases, inventory logs
 *   - All backup records, referral data, support tickets
 *   - All loyalty programs, CRM data, notifications
 *   - All branches, API keys, webhooks, alert configs
 *   - All migration data, return/refund records
 *   - All stock transfers, audit logs (for shops)
 *
 * Only the super admin user(s) will remain.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const config = require('../src/config');

const COLLECTIONS_TO_CLEAR = [
  'shops',
  'products',
  'orders',
  'customers',
  'users',
  'suppliers',
  'purchases',
  'expenses',
  'employees',
  'branches',
  'inventorylogs',
  'notifications',
  'backups',
  'apiKeys',
  'webhooks',
  'alertconfigs',
  'returns',
  'referrals',
  'supporttickets',
  'stocktransfers',
  'loyaltytransactions',
  'membershiptiers',
  'enquiries',
  'auditlogs',
  'counters',
];

async function cleanup() {
  console.log('🔧 Connecting to MongoDB...');
  await mongoose.connect(config.mongodb.uri, config.mongodb.options);
  console.log(`✅ Connected: ${mongoose.connection.host}\n`);

  const db = mongoose.connection.db;

  // First, find all shop IDs to determine what to delete
  const shopsCollection = db.collection('shops');
  const shopIds = await shopsCollection.distinct('_id');
  const shopIdStrings = shopIds.map(id => id.toString());
  console.log(`📊 Found ${shopIds.length} shop(s) to delete`);

  // Find super admin users to preserve
  const usersCollection = db.collection('users');
  const superAdmins = await usersCollection.find({ role: 'super_admin' }).toArray();
  const superAdminIds = superAdmins.map(u => u._id);
  console.log(`👑 Preserving ${superAdmins.length} super admin(s):`);
  superAdmins.forEach(admin => {
    console.log(`   - ${admin.email} (${admin.name || 'No name'})`);
  });

  const results = {};

  for (const collectionName of COLLECTIONS_TO_CLEAR) {
    const collection = db.collection(collectionName);
    let deleteResult;

    if (collectionName === 'shops') {
      // Shops don't have a shopId field - delete all unconditionally
      deleteResult = await collection.deleteMany({});
    } else if (collectionName === 'users') {
      // Delete non-super-admin users
      deleteResult = await collection.deleteMany({ role: { $ne: 'super_admin' } });
    } else if (collectionName === 'auditlogs') {
      // Delete audit logs that reference shops (not super admin actions)
      deleteResult = await collection.deleteMany({
        $or: [
          { resource: { $ne: 'User' } },
          { user: { $nin: superAdminIds.map(id => id.toString()) } },
        ]
      });
    } else if (collectionName === 'counters') {
      deleteResult = await collection.deleteMany({});
    } else {
      // Check if collection has shopId field
      const sampleDoc = await collection.findOne({});
      if (sampleDoc && sampleDoc.shopId) {
        // Delete documents whose shopId references a shop being deleted
        deleteResult = await collection.deleteMany({
          shopId: { $in: shopIds }
        });
      } else {
        // Try deleting by checking if there's any reference to these shops
        deleteResult = { deletedCount: 0 };
        console.log(`   ⏭️  Skipped ${collectionName} (no shopId field)`);
      }
    }

    results[collectionName] = deleteResult.deletedCount || 0;
    console.log(`   🗑️  ${collectionName}: ${deleteResult.deletedCount || 0} document(s) deleted`);
  }

  // Verify super admin still exists
  const remainingSuperAdmins = await usersCollection.find({ role: 'super_admin' }).toArray();
  console.log(`\n✅ Cleanup complete!`);
  console.log(`   Remaining super admins: ${remainingSuperAdmins.length}`);
  console.log(`   Total documents removed: ${Object.values(results).reduce((a, b) => a + b, 0)}`);

  // Summary
  console.log(`\n📋 Summary:`);
  for (const [coll, count] of Object.entries(results)) {
    if (count > 0) {
      console.log(`   ✅ ${coll}: ${count} deleted`);
    }
  }

  await mongoose.disconnect();
  console.log('\n🔌 Disconnected from MongoDB');
  process.exit(0);
}

cleanup().catch(err => {
  console.error('❌ Cleanup failed:', err);
  process.exit(1);
});
