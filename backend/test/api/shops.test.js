/**
 * Shops API Tests
 * @route GET    /api/shops
 * @route POST   /api/shops
 * @route GET    /api/shops/:id
 * @route PUT    /api/shops/:id
 * @route DELETE /api/shops/:id
 */

const request = require('supertest');
const { app, getSuperAdminToken } = require('../helpers/setup');

jest.setTimeout(30000);

describe('Shops API', () => {
  let token;
  let createdShopId;

  beforeAll(async () => {
    token = await getSuperAdminToken();
  }, 15000);

  // ─── Create Shop ──────────────────────────────────────────────────

  describe('POST /api/shops', () => {
    it('should create a new shop', async () => {
      const res = await request(app)
        .post('/api/shops')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Test Shop - API Test',
          businessType: 'grocery_store',
          contact: {
            email: 'testshop@test.com',
            phone: '+919999999991',
          },
          address: {
            line1: '123 Test Street',
            city: 'Mumbai',
            state: 'Maharashtra',
            pincode: '400001',
          },
          adminEmail: `testadmin_${Date.now()}@test.com`,
          password: 'TestAdmin@123',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.shop.name).toBe('Test Shop - API Test');
      expect(res.body.data.shop.businessType).toBe('grocery_store');

      createdShopId = res.body.data.shop._id;
    });

    it('should fail without auth token', async () => {
      const res = await request(app)
        .post('/api/shops')
        .send({ name: 'Unauthorized Shop' });

      expect(res.status).toBe(401);
    });
  });

  // ─── Get Shops ────────────────────────────────────────────────────

  describe('GET /api/shops', () => {
    it('should return paginated shops', async () => {
      const res = await request(app)
        .get('/api/shops')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body).toHaveProperty('pagination');
      expect(res.body.pagination).toHaveProperty('page');
      expect(res.body.pagination).toHaveProperty('total');
    });

    it('should support pagination query params', async () => {
      const res = await request(app)
        .get('/api/shops?page=1&limit=5')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.pagination.page).toBe(1);
      expect(res.body.pagination.limit).toBe(5);
    });
  });

  // ─── Get Single Shop ──────────────────────────────────────────────

  describe('GET /api/shops/:id', () => {
    it('should return a shop by ID', async () => {
      // Re-fetch from list if we don't have an ID
      if (!createdShopId) {
        const listRes = await request(app)
          .get('/api/shops')
          .set('Authorization', `Bearer ${token}`);
        createdShopId = listRes.body.data[0]?._id;
        if (!createdShopId) return; // skip if no shops
      }

      const res = await request(app)
        .get(`/api/shops/${createdShopId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data._id).toBe(createdShopId);
    });

    it('should return 404 for non-existent shop', async () => {
      const fakeId = '000000000000000000000000';
      const res = await request(app)
        .get(`/api/shops/${fakeId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });
  });

  // ─── Update Shop ──────────────────────────────────────────────────

  describe('PUT /api/shops/:id', () => {
    it('should update a shop name', async () => {
      if (!createdShopId) return;

      const res = await request(app)
        .put(`/api/shops/${createdShopId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Updated Test Shop Name' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Updated Test Shop Name');
    });
  });
});
