/**
 * Loyalty Flow Test
 *
 * End-to-end test of the loyalty tier system:
 * 1. Create a shop
 * 2. Create a shop_admin user via model directly
 * 3. Login as shop admin
 * 4. Create Silver, Gold, Platinum tiers
 * 5. Fetch & verify tiers sorted by level
 * 6. Simulate frontend display logic
 * 7. Update a tier
 * 8. Deactivate a tier
 * 9. Validation
 * 10. Verify frontend-compatible response format
 */
const { app, getSuperAdminToken } = require('../helpers/setup');
const request = require('supertest');
const mongoose = require('mongoose');
const User = require('../../src/models/User');
const { getDefaultPermissions } = require('../../src/middleware/rbac');

let superToken;
let shopAdminToken;
let shopId;

beforeAll(async () => {
  superToken = await getSuperAdminToken();

  // Step 1: Create a test shop
  const shopRes = await request(app)
    .post('/api/shops')
    .set('Authorization', `Bearer ${superToken}`)
    .send({
      name: `Loyalty Test Shop ${Date.now()}`,
      businessType: 'medical_store',
      address: { line1: 'Test Address', city: 'Test City', state: 'Test State', pincode: '123456' },
      contact: { email: `loyalty_shop_${Date.now()}@test.com`, phone: '9999999999' },
      status: 'active',
    });

  shopId = shopRes.body.data?._id || shopRes.body.data?.shop?._id;
  if (!shopId) throw new Error(`Shop creation failed: ${JSON.stringify(shopRes.body)}`);

  // Step 2: Create a shop_admin user directly via model
  const adminEmail = `shop_admin_loyalty_${Date.now()}@test.com`;
  const adminPass = 'TestPass@123';

  await User.create({
    shopId,
    name: 'Test Shop Admin',
    email: adminEmail,
    phone: '9999999999',
    password: adminPass,
    role: 'shop_admin',
    permissions: getDefaultPermissions('shop_admin'),
    isVerified: true,
  });

  // Step 3: Login as shop admin
  const loginRes = await request(app)
    .post('/api/auth/login')
    .send({ email: adminEmail, password: adminPass });

  if (!loginRes.body.success) {
    throw new Error(`Shop admin login failed: ${loginRes.body.message}`);
  }
  shopAdminToken = loginRes.body.token;
}, 30000);

afterAll(async () => {
  // Cleanup
  if (shopId && superToken) {
    await request(app)
      .put(`/api/shops/${shopId}`)
      .set('Authorization', `Bearer ${superToken}`)
      .send({ status: 'inactive' })
      .catch(() => {});
  }
});

// ─── Test 1: Create Silver tier ───
test('should create a Silver loyalty tier', async () => {
  const res = await request(app)
    .post('/api/loyalty/tiers')
    .set('Authorization', `Bearer ${shopAdminToken}`)
    .set('x-shop-id', shopId)
    .send({
      name: 'Silver',
      level: 1,
      minPoints: 100,
      minSpend: 2000,
      benefits: { discountPercent: 5, pointsMultiplier: 1, freeDelivery: false, prioritySupport: false, birthdayBonus: 50 },
      color: '#C0C0C0',
      sortOrder: 1,
    });

  expect(res.status).toBe(201);
  expect(res.body.success).toBe(true);
  expect(res.body.data.name).toBe('Silver');
  global.silverTier = res.body.data;
});

// ─── Test 2: Create Gold tier ───
test('should create a Gold loyalty tier with full benefits', async () => {
  const res = await request(app)
    .post('/api/loyalty/tiers')
    .set('Authorization', `Bearer ${shopAdminToken}`)
    .set('x-shop-id', shopId)
    .send({
      name: 'Gold',
      level: 2,
      minPoints: 500,
      minSpend: 10000,
      benefits: { discountPercent: 10, pointsMultiplier: 1.5, freeDelivery: true, prioritySupport: false, birthdayBonus: 200 },
      color: '#FFD700',
      sortOrder: 2,
    });

  expect(res.status).toBe(201);
  expect(res.body.success).toBe(true);
  expect(res.body.data.name).toBe('Gold');
  expect(res.body.data.level).toBe(2);
  expect(res.body.data.benefits.discountPercent).toBe(10);
  expect(res.body.data.benefits.pointsMultiplier).toBe(1.5);
  expect(res.body.data.benefits.freeDelivery).toBe(true);
  expect(res.body.data.benefits.birthdayBonus).toBe(200);
  global.goldTier = res.body.data;
});

// ─── Test 3: Create Platinum tier ───
test('should create a Platinum loyalty tier', async () => {
  const res = await request(app)
    .post('/api/loyalty/tiers')
    .set('Authorization', `Bearer ${shopAdminToken}`)
    .set('x-shop-id', shopId)
    .send({
      name: 'Platinum',
      level: 3,
      minPoints: 2000,
      minSpend: 50000,
      benefits: { discountPercent: 20, pointsMultiplier: 2, freeDelivery: true, prioritySupport: true, birthdayBonus: 500 },
      color: '#E5E4E2',
      sortOrder: 3,
    });

  expect(res.status).toBe(201);
  expect(res.body.success).toBe(true);
  expect(res.body.data.name).toBe('Platinum');
  global.platinumTier = res.body.data;
});

// ─── Test 4: Fetch & verify tiers ───
test('should return all tiers sorted by level ascending', async () => {
  const res = await request(app)
    .get('/api/loyalty/tiers')
    .set('Authorization', `Bearer ${shopAdminToken}`)
    .set('x-shop-id', shopId);

  expect(res.status).toBe(200);
  expect(res.body.success).toBe(true);
  expect(Array.isArray(res.body.data)).toBe(true);
  expect(res.body.data.length).toBeGreaterThanOrEqual(3);

  // Verify sorted by level ascending
  const levels = res.body.data.map(t => t.level);
  for (let i = 1; i < levels.length; i++) {
    expect(levels[i]).toBeGreaterThanOrEqual(levels[i - 1]);
  }

  const silver = res.body.data.find(t => t.name === 'Silver');
  const gold = res.body.data.find(t => t.name === 'Gold');
  const platinum = res.body.data.find(t => t.name === 'Platinum');
  expect(silver).toBeDefined();
  expect(gold).toBeDefined();
  expect(platinum).toBeDefined();

  // ─── Frontend display simulation ───
  // Frontend: const b = t.benefits || {};
  // Then conditionally renders based on these checks:
  //   {b.discountPercent > 0 && "% discount"}
  //   {b.pointsMultiplier > 1 && "x multiplier"}
  //   {b.birthdayBonus > 0 && "birthday bonus"}
  //   {b.freeDelivery && "Free Delivery" badge}
  //   {b.prioritySupport && "Priority Support" badge}

  // Silver: level 1, 5% discount, 1x multiplier, 50 birthday bonus
  const sb = silver.benefits || {};
  expect(sb.discountPercent > 0).toBe(true);     // shows "5% discount"
  expect(sb.pointsMultiplier > 1).toBe(false);   // hides "1x multiplier"
  expect(sb.birthdayBonus > 0).toBe(true);       // shows "50 birthday bonus"
  expect(sb.freeDelivery).toBe(false);           // hides badge
  expect(sb.prioritySupport).toBe(false);        // hides badge

  // Gold: level 2, 10% discount, 1.5x multiplier, 200 birthday bonus, free delivery
  const gb = gold.benefits || {};
  expect(gb.discountPercent > 0).toBe(true);     // shows "10% discount"
  expect(gb.pointsMultiplier > 1).toBe(true);    // shows "1.5x multiplier"
  expect(gb.birthdayBonus > 0).toBe(true);       // shows "200 birthday bonus"
  expect(gb.freeDelivery).toBe(true);            // shows "Free Delivery" badge
  expect(gb.prioritySupport).toBe(false);        // hides badge

  // Platinum: level 3, 20% discount, 2x multiplier, 500 birthday bonus, free delivery, priority support
  const pb = platinum.benefits || {};
  expect(pb.discountPercent > 0).toBe(true);     // shows "20% discount"
  expect(pb.pointsMultiplier > 1).toBe(true);    // shows "2x multiplier"
  expect(pb.birthdayBonus > 0).toBe(true);       // shows "500 birthday bonus"
  expect(pb.freeDelivery).toBe(true);            // shows badge
  expect(pb.prioritySupport).toBe(true);         // shows badge
});

// ─── Test 5: Update a tier ───
test('should update an existing tier', async () => {
  const res = await request(app)
    .put(`/api/loyalty/tiers/${global.goldTier._id}`)
    .set('Authorization', `Bearer ${shopAdminToken}`)
    .set('x-shop-id', shopId)
    .send({
      minPoints: 600,
      benefits: { discountPercent: 12, pointsMultiplier: 1.8, freeDelivery: true, prioritySupport: true, birthdayBonus: 300 },
      color: '#FFA500',
    });

  expect(res.status).toBe(200);
  expect(res.body.success).toBe(true);
  expect(res.body.data.minPoints).toBe(600);
  expect(res.body.data.benefits.discountPercent).toBe(12);
  expect(res.body.data.benefits.pointsMultiplier).toBe(1.8);
  expect(res.body.data.benefits.prioritySupport).toBe(true);
  expect(res.body.data.color).toBe('#FFA500');
});

// ─── Test 6: Deactivate a tier ───
test('should deactivate a tier', async () => {
  const res = await request(app)
    .delete(`/api/loyalty/tiers/${global.silverTier._id}`)
    .set('Authorization', `Bearer ${shopAdminToken}`)
    .set('x-shop-id', shopId);

  expect(res.status).toBe(200);
  expect(res.body.success).toBe(true);
  expect(res.body.message).toBe('Tier deactivated');

  // Verify it's deactivated
  const getRes = await request(app)
    .get('/api/loyalty/tiers')
    .set('Authorization', `Bearer ${shopAdminToken}`)
    .set('x-shop-id', shopId);

  const deactivated = getRes.body.data.find(t => t._id === global.silverTier._id);
  expect(deactivated).toBeDefined();
  expect(deactivated.isActive).toBe(false);
});

// ─── Test 7: Validation — reject tier without name ───
test('should reject tier without name', async () => {
  const res = await request(app)
    .post('/api/loyalty/tiers')
    .set('Authorization', `Bearer ${shopAdminToken}`)
    .set('x-shop-id', shopId)
    .send({ level: 1, minPoints: 0, benefits: { discountPercent: 0 } });

  expect(res.status).toBe(400);
  expect(res.body.success).toBe(false);
});

// ─── Test 8: Frontend-compatible response format ───
test('should return response format compatible with frontend rendering', async () => {
  const res = await request(app)
    .get('/api/loyalty/tiers')
    .set('Authorization', `Bearer ${shopAdminToken}`)
    .set('x-shop-id', shopId);

  expect(res.status).toBe(200);
  expect(res.body.success).toBe(true);

  // Frontend does: tiersRes.data?.data || []
  const tiers = res.body.data;
  expect(Array.isArray(tiers)).toBe(true);

  // Verify every tier has all fields the frontend accesses
  for (const t of tiers) {
    expect(t._id).toBeDefined();
    expect(t.name).toBeDefined();
    expect(typeof t.level).toBe('number');
    expect(typeof t.minPoints).toBe('number');

    // Frontend: const b = t.benefits || {};
    const b = t.benefits || {};
    expect('discountPercent' in b).toBe(true);
    expect('pointsMultiplier' in b).toBe(true);
    expect('freeDelivery' in b).toBe(true);
    expect('prioritySupport' in b).toBe(true);
    expect('birthdayBonus' in b).toBe(true);

    expect('color' in t).toBe(true);
    expect('sortOrder' in t).toBe(true);
    expect('isActive' in t).toBe(true);
  }
});
