/**
 * Orders API Tests
 * @file tests/api/orders.spec.js
 * 
 * Tests: CRUD for /api/orders, cancel, today summary
 */

import { test, expect } from '@playwright/test';

const SUPER_ADMIN_EMAIL = 'ujwal880522@gmail.com';
const SUPER_ADMIN_PASSWORD = 'Ujwal@4580';
let authToken;
let createdOrderId;
let shopId;
let productId;

test.describe('Orders API', () => {
  test.beforeAll(async ({ request }) => {
    // Login
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

    // Create a product to use in order
    if (shopId) {
      const prodRes = await request.post('/api/products', {
        headers: {
          Authorization: `Bearer ${authToken}`,
          'x-shop-id': shopId,
        },
        data: {
          name: `OrderTest-Product ${Date.now()}`,
          sku: `ORD-SKU-${Date.now()}`,
          category: 'Test',
          unit: 'pcs',
          pricing: { mrp: 200, sellingPrice: 180, purchasePrice: 140, gstRate: 18 },
          tax: { hsnCode: '123456' },
          inventory: { quantity: 100, minStockLevel: 10 },
          shopId,
        },
      });
      const prodBody = await prodRes.json();
      if (prodBody.success) {
        productId = prodBody.data._id;
      }
    }
  });

  // ─── Create Order ─────────────────────────────────────────────────

  test.describe('POST /api/orders', () => {
    test('should create a new order (POS)', async ({ request }) => {
      test.skip(!productId, 'No product available');

      const orderData = {
        customerName: 'Test Customer',
        customerMobile: '+919999888888',
        items: [
          {
            productId: productId,
            quantity: 2,
            sellingPrice: 180,
            discountPercent: 0,
          },
        ],
        payments: [{ method: 'cash', amount: 414.92 }],
        type: 'retail',
        posMode: true,
      };

      const res = await request.post('/api/orders', {
        headers: {
          Authorization: `Bearer ${authToken}`,
          'x-shop-id': shopId,
        },
        data: orderData,
      });
      const body = await res.json();

      expect(res.status()).toBe(201);
      expect(body.success).toBe(true);
      expect(body.data).toHaveProperty('orderNumber');
      expect(body.data.items.length).toBe(1);
      expect(body.data.grandTotal).toBeCloseTo(414.92, 1);
      expect(body.data.paymentStatus).toBe('completed');

      createdOrderId = body.data._id;
    });

    test('should fail without auth', async ({ request }) => {
      const res = await request.post('/api/orders', {
        data: { items: [{ productId: 'fake', quantity: 1 }] },
      });
      expect(res.status()).toBe(401);
    });
  });

  // ─── Get Orders ───────────────────────────────────────────────────

  test.describe('GET /api/orders', () => {
    test('should return paginated orders', async ({ request }) => {
      const res = await request.get('/api/orders', {
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

    test('should support status filter', async ({ request }) => {
      const res = await request.get('/api/orders?status=completed', {
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

  // ─── Get Single Order ─────────────────────────────────────────────

  test.describe('GET /api/orders/:id', () => {
    test('should return an order by ID', async ({ request }) => {
      test.skip(!createdOrderId, 'No order created');

      const res = await request.get(`/api/orders/${createdOrderId}`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
          'x-shop-id': shopId,
        },
      });
      const body = await res.json();

      expect(res.status()).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data._id).toBe(createdOrderId);
    });
  });

  // ─── Cancel Order ─────────────────────────────────────────────────

  test.describe('PUT /api/orders/:id/cancel', () => {
    test('should cancel an order', async ({ request }) => {
      test.skip(!createdOrderId, 'No order created');

      const res = await request.put(`/api/orders/${createdOrderId}/cancel`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
          'x-shop-id': shopId,
        },
      });
      const body = await res.json();

      expect(res.status()).toBe(200);
      expect(body.success).toBe(true);
      expect(body.message).toContain('cancelled');
      expect(body.data.status).toBe('cancelled');
    });
  });

  // ─── Today Summary ────────────────────────────────────────────────

  test.describe('GET /api/orders/today/summary', () => {
    test('should return today order summary', async ({ request }) => {
      const res = await request.get('/api/orders/today/summary', {
        headers: {
          Authorization: `Bearer ${authToken}`,
          'x-shop-id': shopId,
        },
      });
      const body = await res.json();

      expect(res.status()).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data).toHaveProperty('orders');
      expect(body.data).toHaveProperty('summary');
      expect(body.data.summary).toHaveProperty('totalOrders');
      expect(body.data.summary).toHaveProperty('totalRevenue');
    });
  });
});
