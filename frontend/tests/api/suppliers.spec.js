/**
 * Suppliers API Tests
 * @file tests/api/suppliers.spec.js
 * 
 * Tests: CRUD for /api/suppliers
 */

import { test, expect } from '@playwright/test';

const SUPER_ADMIN_EMAIL = 'ujwal880522@gmail.com';
const SUPER_ADMIN_PASSWORD = 'Ujwal@4580';
let authToken;
let createdSupplierId;
let shopId;

test.describe('Suppliers API', () => {
  test.beforeAll(async ({ request }) => {
    const loginRes = await request.post('/api/auth/login', {
      data: { email: SUPER_ADMIN_EMAIL, password: SUPER_ADMIN_PASSWORD },
    });
    const loginBody = await loginRes.json();
    authToken = loginBody.token;

    const meRes = await request.get('/api/auth/me', {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const meBody = await meRes.json();
    shopId = meBody.user?.shopId || '';
  });

  test.describe('POST /api/suppliers', () => {
    test('should create a new supplier', async ({ request }) => {
      const supplierData = {
        name: 'Test Supplier',
        mobile: `+919999${String(Math.floor(100000 + Math.random() * 900000))}`,
        email: `supplier_${Date.now()}@test.com`,
        address: {
          line1: '789 Supplier St',
          city: 'Mumbai',
          state: 'Maharashtra',
          pincode: '400001',
        },
        gstin: '27AABCU9603R1ZM',
        paymentTerms: 'net_30',
      };

      const res = await request.post('/api/suppliers', {
        headers: {
          Authorization: `Bearer ${authToken}`,
          'x-shop-id': shopId,
        },
        data: supplierData,
      });
      const body = await res.json();

      expect(res.status()).toBe(201);
      expect(body.success).toBe(true);
      expect(body.data.name).toBe('Test Supplier');

      createdSupplierId = body.data._id;
    });

    test('should fail without auth', async ({ request }) => {
      const res = await request.post('/api/suppliers', {
        data: { name: 'Unauthorized' },
      });
      expect(res.status()).toBe(401);
    });
  });

  test.describe('GET /api/suppliers', () => {
    test('should return paginated suppliers', async ({ request }) => {
      const res = await request.get('/api/suppliers', {
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
  });

  test.describe('GET /api/suppliers/:id', () => {
    test('should return a supplier by ID', async ({ request }) => {
      test.skip(!createdSupplierId, 'No supplier created');

      const res = await request.get(`/api/suppliers/${createdSupplierId}`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
          'x-shop-id': shopId,
        },
      });
      const body = await res.json();

      expect(res.status()).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data._id).toBe(createdSupplierId);
    });
  });

  test.describe('PUT /api/suppliers/:id', () => {
    test('should update a supplier', async ({ request }) => {
      test.skip(!createdSupplierId, 'No supplier created');

      const res = await request.put(`/api/suppliers/${createdSupplierId}`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
          'x-shop-id': shopId,
        },
        data: { name: 'Updated Supplier Name' },
      });
      const body = await res.json();

      expect(res.status()).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.name).toBe('Updated Supplier Name');
    });
  });

  test.describe('DELETE /api/suppliers/:id', () => {
    test('should delete a supplier', async ({ request }) => {
      test.skip(!createdSupplierId, 'No supplier created');

      const res = await request.delete(`/api/suppliers/${createdSupplierId}`, {
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
});
