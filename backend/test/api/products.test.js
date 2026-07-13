/**
 * Products API Tests
 * @route GET    /api/products
 * @route POST   /api/products
 * @route GET    /api/products/:id
 * @route PUT    /api/products/:id
 * @route DELETE /api/products/:id
 */

const request = require('supertest');
const { app, getSuperAdminToken } = require('../helpers/setup');

describe('Products API', () => {
  let token;
  let createdProductId;
  let shopId;

  beforeAll(async () => {
    token = await getSuperAdminToken();

    // Get the super admin's shop ID from their profile
    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    if (meRes.body.user?.shopId) {
      shopId = meRes.body.user.shopId;
    } else {
      // If super admin has no shop, fetch the first shop in the system
      const shopsRes = await request(app)
        .get('/api/shops')
        .set('Authorization', `Bearer ${token}`);

      if (shopsRes.body.data?.length > 0) {
        shopId = shopsRes.body.data[0]._id;
      }
    }
  }, 15000);

  // ─── Create Product ───────────────────────────────────────────────

  describe('POST /api/products', () => {
    it('should create a new product', async () => {
      if (!shopId) {
        console.warn('Skipping: no shopId available');
        return;
      }

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
        shopId, // Send shopId in the body for super admin
      };

      const res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${token}`)
        .set('x-shop-id', shopId)
        .send(productData);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe(productData.name);

      createdProductId = res.body.data._id;
    });
  });

  // ─── Get Products ─────────────────────────────────────────────────

  describe('GET /api/products', () => {
    it('should return paginated products', async () => {
      const res = await request(app)
        .get('/api/products')
        .set('Authorization', `Bearer ${token}`)
        .set('x-shop-id', shopId || '');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body).toHaveProperty('pagination');
    });

    it('should support search query', async () => {
      const res = await request(app)
        .get('/api/products?search=Test')
        .set('Authorization', `Bearer ${token}`)
        .set('x-shop-id', shopId || '');

      expect(res.status).toBe(200);
    });

    it('should fail without auth token', async () => {
      const res = await request(app).get('/api/products');
      expect(res.status).toBe(401);
    });
  });

  // ─── Get Single Product ───────────────────────────────────────────

  describe('GET /api/products/:id', () => {
    it('should return a product by ID', async () => {
      if (!createdProductId) return;

      const res = await request(app)
        .get(`/api/products/${createdProductId}`)
        .set('Authorization', `Bearer ${token}`)
        .set('x-shop-id', shopId || '');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data._id).toBe(createdProductId);
    });

    it('should return 404 for non-existent product', async () => {
      const fakeId = '000000000000000000000000';
      const res = await request(app)
        .get(`/api/products/${fakeId}`)
        .set('Authorization', `Bearer ${token}`)
        .set('x-shop-id', shopId || '');

      expect(res.status).toBe(404);
    });
  });

  // ─── Update Product ───────────────────────────────────────────────

  describe('PUT /api/products/:id', () => {
    it('should update a product name', async () => {
      if (!createdProductId) return;

      const res = await request(app)
        .put(`/api/products/${createdProductId}`)
        .set('Authorization', `Bearer ${token}`)
        .set('x-shop-id', shopId || '')
        .send({ name: 'Updated Product Name' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Updated Product Name');
    });
  });

  // ─── Delete Product ───────────────────────────────────────────────

  describe('DELETE /api/products/:id', () => {
    it('should soft-delete a product', async () => {
      if (!createdProductId) return;

      const res = await request(app)
        .delete(`/api/products/${createdProductId}`)
        .set('Authorization', `Bearer ${token}`)
        .set('x-shop-id', shopId || '');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('deactivated');
    });
  });
});
