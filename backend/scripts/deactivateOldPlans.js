/**
 * Deactivate old test plans
 * Removes old plans (Basic Plan, Bussiness plan, Business Pro Plan) from the active list
 * so only Monthly Plan and Yearly Plan show on the billing page.
 *
 * Usage: node scripts/deactivateOldPlans.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const config = require('../src/config');

async function deactivateOldPlans() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(config.mongodb.uri, config.mongodb.options);
    console.log('Connected.');

    const SubscriptionPlan = require('../src/models/SubscriptionPlan');

    const result = await SubscriptionPlan.updateMany(
      { name: { $in: ['Basic Plan', 'Bussiness plan', 'Business Pro Plan'] } },
      { $set: { isActive: false } }
    );
    console.log(`Deactivated ${result.modifiedCount} old plan(s)`);

    const active = await SubscriptionPlan.find({ isActive: true }).sort({ sortOrder: 1 }).lean();
    console.log('\nActive plans now:');
    active.forEach(p => console.log(`  • ${p.name} — ₹${p.monthlyPrice}/mo`));

    await mongoose.disconnect();
    console.log('\nDone!');
    process.exit(0);
  } catch (error) {
    console.error('Failed:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

deactivateOldPlans();
