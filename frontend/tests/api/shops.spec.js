/**
 * Shops API Tests
 * @file tests/api/shops.spec.js
 * 
 * Tests: CRUD for /api/shops
 */

import { test, expect } from '@playwright/test';

const SUPER_ADMIN_EMAIL = 'ujwal880522@gmail.com';
const SUPER_ADMIN_PASSWORD = 'Ujwal@4580';
let authToken;
let createdShopId;

test.describe('Shops API', () => {
  test.beforeAll(async ({ request }) => {
    const loginRes = await request.post('/api/auth/login', {
      data: { email: SUPER_ADMIN_EMAIL, password: SUPER_ADMIN_PASSWORD },
    });
    const loginBody = await loginRes.json();
    authToken = loginBody.token;
  });

  // ─── Create Shop ──────────────────────────────────────────────────

  test.describe('POST /api/shops', () => {
    test('should create a new shop', async ({ request }) => {
      const res = await request.post('/api/shops', {
        headers: { Authorization: `Bearer ${authToken}` },
        data: {
          name: 'Test Shop - Playwright',
          businessType: 'grocery_store',
          contact: {
            email: 'testshop-pw@test.com',
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
          isTrial: true,
          trialDays: 14,
        },
      });
      const body = await res.json();

      expect(res.status()).toBe(201);
      expect(body.success).toBe(true);
      expect(body.data.shop.name).toBe('Test Shop - Playwright');
      expect(body.data.shop.businessType).toBe('grocery_store');

      createdShopId = body.data.shop._id;
    });

    test('should fail without auth token', async ({ request }) => {
      const res = await request.post('/api/shops', {
        data: { name: 'Unauthorized Shop' },
      });

      expect(res.status()).toBe(401);
    });
  });

  // ─── Get Shops ────────────────────────────────────────────────────

  test.describe('GET /api/shops', () => {
    test('should return paginated shops', async ({ request }) => {
      const res = await request.get('/api/shops', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const body = await res.json();

      expect(res.status()).toBe(200);
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
      expect(body).toHaveProperty('pagination');
      expect(body.pagination).toHaveProperty('page');
      expect(body.pagination).toHaveProperty('total');
    });

    test('should support pagination query params', async ({ request }) => {
      const res = await request.get('/api/shops?page=1&limit=5', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const body = await res.json();

      expect(res.status()).toBe(200);
      expect(body.pagination.page).toBe(1);
      expect(body.pagination.limit).toBe(5);
    });

    test('should support search query', async ({ request }) => {
      const res = await request.get('/api/shops?search=Test', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const body = await res.json();

      expect(res.status()).toBe(200);
      expect(body.success).toBe(true);
    });
  });

  // ─── Get Single Shop ──────────────────────────────────────────────

  test.describe('GET /api/shops/:id', () => {
    test('should return a shop by ID', async ({ request }) => {
      if (!createdShopId) {
        // Fetch first shop from list
        const listRes = await request.get('/api/shops', {
          headers: { Authorization: `Bearer ${authToken}` },
        });
        const listBody = await listRes.json();
        createdShopId = listBody.data[0]?._id;
        if (!createdShopId) return; // skip if no shops
      }

      const res = await request.get(`/api/shops/${createdShopId}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const body = await res.json();

      expect(res.status()).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data._id).toBe(createdShopId);
    });

    test('should return 404 for non-existent shop', async ({ request }) => {
      const res = await request.get('/api/shops/000000000000000000000000', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const body = await res.json();

      expect(res.status()).toBe(404);
      expect(body.success).toBe(false);
    });
  });

  // ─── Update Shop ──────────────────────────────────────────────────

  test.describe('PUT /api/shops/:id', () => {
    test('should update a shop name', async ({ request }) => {
      if (!createdShopId) return;

      const res = await request.put(`/api/shops/${createdShopId}`, {
        headers: { Authorization: `Bearer ${authToken}` },
        data: { name: 'Updated Shop Name - PW' },
      });
      const body = await res.json();

      expect(res.status()).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.name).toBe('Updated Shop Name - PW');
    });
  });
});
