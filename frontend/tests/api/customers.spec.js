/**
 * Customers API Tests
 * @file tests/api/customers.spec.js
 * 
 * Tests: CRUD for /api/customers, search, loyalty, credit
 */

import { test, expect } from '@playwright/test';

const SUPER_ADMIN_EMAIL = 'ujwal880522@gmail.com';
const SUPER_ADMIN_PASSWORD = 'Ujwal@4580';
let authToken;
let createdCustomerId;
let shopId;

test.describe('Customers API', () => {
  test.beforeAll(async ({ request }) => {
    const loginRes = await request.post('/api/auth/login', {
      data: { email: SUPER_ADMIN_EMAIL, password: SUPER_ADMIN_PASSWORD },
    });
    const loginBody = await loginRes.json();
    authToken = loginBody.token;

    // Get shop context
    const meRes = await request.get('/api/auth/me', {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const meBody = await meRes.json();
    shopId = meBody.user?.shopId || '';
  });

  // ─── Create Customer ──────────────────────────────────────────────

  test.describe('POST /api/customers', () => {
    test('should create a new customer', async ({ request }) => {
      const customerData = {
        name: 'Test Customer',
        mobile: `+919999${String(Math.floor(100000 + Math.random() * 900000))}`,
        email: `customer_${Date.now()}@test.com`,
        address: { line1: '456 Test Ave', city: 'Delhi', state: 'Delhi', pincode: '110001' },
        creditLimit: 5000,
      };

      const res = await request.post('/api/customers', {
        headers: {
          Authorization: `Bearer ${authToken}`,
          'x-shop-id': shopId,
        },
        data: customerData,
      });
      const body = await res.json();

      expect(res.status()).toBe(201);
      expect(body.success).toBe(true);
      expect(body.data.name).toBe('Test Customer');
      expect(body.data).toHaveProperty('customerId');

      createdCustomerId = body.data._id;
    });

    test('should fail without auth', async ({ request }) => {
      const res = await request.post('/api/customers', {
        data: { name: 'Unauthorized', mobile: '+919999999999' },
      });
      expect(res.status()).toBe(401);
    });
  });

  // ─── Get Customers ────────────────────────────────────────────────

  test.describe('GET /api/customers', () => {
    test('should return paginated customers', async ({ request }) => {
      const res = await request.get('/api/customers', {
        headers: {
          Authorization: `Bearer ${authToken}`,
          'x-shop-id': shopId,
        },
      });
      const body = await res.json();

      expect(res.status()).toBe(200);
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
      expect(body).toHaveProperty('pagination');
    });

    test('should support search', async ({ request }) => {
      const res = await request.get('/api/customers?search=Test', {
        headers: {
          Authorization: `Bearer ${authToken}`,
          'x-shop-id': shopId,
        },
      });
      const body = await res.json();

      expect(res.status()).toBe(200);
      expect(body.success).toBe(true);
    });
  });

  // ─── Get Single Customer ──────────────────────────────────────────

  test.describe('GET /api/customers/:id', () => {
    test('should return a customer by ID', async ({ request }) => {
      test.skip(!createdCustomerId, 'No customer created');

      const res = await request.get(`/api/customers/${createdCustomerId}`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
          'x-shop-id': shopId,
        },
      });
      const body = await res.json();

      expect(res.status()).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data._id).toBe(createdCustomerId);
      // Should include orders and loyalty transactions
      expect(body.data).toHaveProperty('orders');
      expect(body.data).toHaveProperty('loyaltyTransactions');
    });
  });

  // ─── Update Customer ──────────────────────────────────────────────

  test.describe('PUT /api/customers/:id', () => {
    test('should update a customer', async ({ request }) => {
      test.skip(!createdCustomerId, 'No customer created');

      const res = await request.put(`/api/customers/${createdCustomerId}`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
          'x-shop-id': shopId,
        },
        data: { name: 'Updated Customer Name' },
      });
      const body = await res.json();

      expect(res.status()).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.name).toBe('Updated Customer Name');
    });
  });

  // ─── Search Customers ─────────────────────────────────────────────

  test.describe('GET /api/customers/search', () => {
    test('should search customers by mobile', async ({ request }) => {
      const res = await request.get('/api/customers/search?q=Test', {
        headers: {
          Authorization: `Bearer ${authToken}`,
          'x-shop-id': shopId,
        },
      });
      const body = await res.json();

      expect(res.status()).toBe(200);
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
    });
  });

  // ─── Loyalty: Add Points ──────────────────────────────────────────

  test.describe('POST /api/customers/:id/loyalty/add', () => {
    test('should add loyalty points', async ({ request }) => {
      test.skip(!createdCustomerId, 'No customer created');

      const res = await request.post(`/api/customers/${createdCustomerId}/loyalty/add`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
          'x-shop-id': shopId,
        },
        data: { points: 100, description: 'Test bonus' },
      });
      const body = await res.json();

      expect(res.status()).toBe(200);
      expect(body.success).toBe(true);
      expect(body.message).toContain('Added');
    });
  });

  // ─── Delete Customer ──────────────────────────────────────────────

  test.describe('DELETE /api/customers/:id', () => {
    test('should soft-delete a customer', async ({ request }) => {
      test.skip(!createdCustomerId, 'No customer created');

      const res = await request.delete(`/api/customers/${createdCustomerId}`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
          'x-shop-id': shopId,
        },
      });
      const body = await res.json();

      expect(res.status()).toBe(200);
      expect(body.success).toBe(true);
      expect(body.message).toContain('deactivated');
    });
  });
});
