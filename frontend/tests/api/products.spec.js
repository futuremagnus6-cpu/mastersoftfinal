/**
 * Products API Tests
 * @file tests/api/products.spec.js
 * 
 * Tests: CRUD for /api/products, search, barcode, categories
 */

import { test, expect } from '@playwright/test';

const SUPER_ADMIN_EMAIL = 'ujwal880522@gmail.com';
const SUPER_ADMIN_PASSWORD = 'Ujwal@4580';
let authToken;
let createdProductId;
let shopId;

test.describe('Products API', () => {
  test.beforeAll(async ({ request }) => {
    // Login as super admin
    const loginRes = await request.post('/api/auth/login', {
      data: { email: SUPER_ADMIN_EMAIL, password: SUPER_ADMIN_PASSWORD },
    });
    const loginBody = await loginRes.json();
    authToken = loginBody.token;

    // Get super admin shop ID from profile
    const meRes = await request.get('/api/auth/me', {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const meBody = await meRes.json();

    if (meBody.user?.shopId) {
      shopId = meBody.user.shopId;
    } else {
      // Fetch first shop
      const shopsRes = await request.get('/api/shops', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const shopsBody = await shopsRes.json();
      if (shopsBody.data?.length > 0) {
        shopId = shopsBody.data[0]._id;
      }
    }

  });

  // ─── Create Product ───────────────────────────────────────────────

  test.describe('POST /api/products', () => {
    test('should create a new product', async ({ request }) => {
      test.skip(!shopId, 'No shopId available');

      const productData = {
        name: `Test Product ${Date.now()}`,
        sku: `SKU-${Date.now()}`,
        category: 'Test Category',
        unit: 'pcs',
        pricing: {
          mrp: 100,
          sellingPrice: 90,
          purchasePrice: 70,
          gstRate: 18,
        },
        tax: {
          hsnCode: '123456',
        },
        inventory: {
          quantity: 50,
          minStockLevel: 10,
        },
      };

      const res = await request.post('/api/products', {
        headers: {
          Authorization: `Bearer ${authToken}`,
          'x-shop-id': shopId,
        },
        data: { ...productData, shopId },
      });
      const body = await res.json();

      expect(res.status()).toBe(201);
      expect(body.success).toBe(true);
      expect(body.data.name).toBe(productData.name);

      createdProductId = body.data._id;
    });

    test('should fail without auth token', async ({ request }) => {
      const res = await request.post('/api/products', {
        data: { name: 'Unauthorized Product', sku: 'UNAUTH-1' },
      });

      expect(res.status()).toBe(401);
    });
  });

  // ─── Get Products ─────────────────────────────────────────────────

  test.describe('GET /api/products', () => {
    test('should return paginated products', async ({ request }) => {
      const res = await request.get('/api/products', {
        headers: {
          Authorization: `Bearer ${authToken}`,
          'x-shop-id': shopId || '',
        },
      });
      const body = await res.json();

      expect(res.status()).toBe(200);
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
      expect(body).toHaveProperty('pagination');
    });

    test('should support search query', async ({ request }) => {
      const res = await request.get('/api/products?search=Test', {
        headers: {
          Authorization: `Bearer ${authToken}`,
          'x-shop-id': shopId || '',
        },
      });
      const body = await res.json();

      expect(res.status()).toBe(200);
      expect(body.success).toBe(true);
    });

    test('should fail without auth', async ({ request }) => {
      const res = await request.get('/api/products');
      expect(res.status()).toBe(401);
    });
  });

  // ─── Get Single Product ───────────────────────────────────────────

  test.describe('GET /api/products/:id', () => {
    test('should return a product by ID', async ({ request }) => {
      test.skip(!createdProductId, 'No product created');

      const res = await request.get(`/api/products/${createdProductId}`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
          'x-shop-id': shopId || '',
        },
      });
      const body = await res.json();

      expect(res.status()).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data._id).toBe(createdProductId);
    });

    test('should return 404 for non-existent product', async ({ request }) => {
      const res = await request.get('/api/products/000000000000000000000000', {
        headers: {
          Authorization: `Bearer ${authToken}`,
          'x-shop-id': shopId || '',
        },
      });

      expect(res.status()).toBe(404);
    });
  });

  // ─── Update Product ───────────────────────────────────────────────

  test.describe('PUT /api/products/:id', () => {
    test('should update a product', async ({ request }) => {
      test.skip(!createdProductId, 'No product created');

      const res = await request.put(`/api/products/${createdProductId}`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
          'x-shop-id': shopId || '',
        },
        data: { name: 'Updated Product - PW' },
      });
      const body = await res.json();

      expect(res.status()).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.name).toBe('Updated Product - PW');
    });
  });

  // ─── Delete Product ───────────────────────────────────────────────

  test.describe('DELETE /api/products/:id', () => {
    test('should soft-delete a product', async ({ request }) => {
      test.skip(!createdProductId, 'No product created');

      const res = await request.delete(`/api/products/${createdProductId}`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
          'x-shop-id': shopId || '',
        },
      });
      const body = await res.json();

      expect(res.status()).toBe(200);
      expect(body.success).toBe(true);
      expect(body.message).toContain('deactivated');
    });
  });

  // ─── Search Products ──────────────────────────────────────────────

  test.describe('GET /api/products/search', () => {
    test('should search products by keyword', async ({ request }) => {
      const res = await request.get('/api/products/search?q=Test', {
        headers: {
          Authorization: `Bearer ${authToken}`,
          'x-shop-id': shopId || '',
        },
      });
      const body = await res.json();

      expect(res.status()).toBe(200);
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
    });

    test('should return empty array for empty query', async ({ request }) => {
      const res = await request.get('/api/products/search', {
        headers: {
          Authorization: `Bearer ${authToken}`,
          'x-shop-id': shopId || '',
        },
      });
      const body = await res.json();

      expect(res.status()).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data).toEqual([]);
    });
  });

  // ─── Get Categories ───────────────────────────────────────────────

  test.describe('GET /api/products/categories/list', () => {
    test('should return list of categories', async ({ request }) => {
      const res = await request.get('/api/products/categories/list', {
        headers: {
          Authorization: `Bearer ${authToken}`,
          'x-shop-id': shopId || '',
        },
      });
      const body = await res.json();

      expect(res.status()).toBe(200);
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
    });
  });
});
