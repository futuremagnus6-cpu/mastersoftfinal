# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: api\orders.spec.js >> Orders API >> POST /api/orders >> should create a new order (POS)
- Location: tests\api\orders.spec.js:61:5

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: 201
Received: 409
```

# Test source

```ts
  1   | /**
  2   |  * Orders API Tests
  3   |  * @file tests/api/orders.spec.js
  4   |  * 
  5   |  * Tests: CRUD for /api/orders, cancel, today summary
  6   |  */
  7   | 
  8   | import { test, expect } from '@playwright/test';
  9   | 
  10  | const SUPER_ADMIN_EMAIL = 'ujwal880522@gmail.com';
  11  | const SUPER_ADMIN_PASSWORD = 'Ujwal@4580';
  12  | let authToken;
  13  | let createdOrderId;
  14  | let shopId;
  15  | let productId;
  16  | 
  17  | test.describe('Orders API', () => {
  18  |   test.beforeAll(async ({ request }) => {
  19  |     // Login
  20  |     const loginRes = await request.post('/api/auth/login', {
  21  |       data: { email: SUPER_ADMIN_EMAIL, password: SUPER_ADMIN_PASSWORD },
  22  |     });
  23  |     const loginBody = await loginRes.json();
  24  |     authToken = loginBody.token;
  25  | 
  26  |     // Get shop context
  27  |     const meRes = await request.get('/api/auth/me', {
  28  |       headers: { Authorization: `Bearer ${authToken}` },
  29  |     });
  30  |     const meBody = await meRes.json();
  31  |     shopId = meBody.user?.shopId || '';
  32  | 
  33  |     // Create a product to use in order
  34  |     if (shopId) {
  35  |       const prodRes = await request.post('/api/products', {
  36  |         headers: {
  37  |           Authorization: `Bearer ${authToken}`,
  38  |           'x-shop-id': shopId,
  39  |         },
  40  |         data: {
  41  |           name: `OrderTest-Product ${Date.now()}`,
  42  |           sku: `ORD-SKU-${Date.now()}`,
  43  |           category: 'Test',
  44  |           unit: 'pcs',
  45  |           pricing: { mrp: 200, sellingPrice: 180, purchasePrice: 140, gstRate: 18 },
  46  |           tax: { hsnCode: '123456' },
  47  |           inventory: { quantity: 100, minStockLevel: 10 },
  48  |           shopId,
  49  |         },
  50  |       });
  51  |       const prodBody = await prodRes.json();
  52  |       if (prodBody.success) {
  53  |         productId = prodBody.data._id;
  54  |       }
  55  |     }
  56  |   });
  57  | 
  58  |   // ─── Create Order ─────────────────────────────────────────────────
  59  | 
  60  |   test.describe('POST /api/orders', () => {
  61  |     test('should create a new order (POS)', async ({ request }) => {
  62  |       test.skip(!productId, 'No product available');
  63  | 
  64  |       const orderData = {
  65  |         customerName: 'Test Customer',
  66  |         customerMobile: '+919999888888',
  67  |         items: [
  68  |           {
  69  |             productId: productId,
  70  |             quantity: 2,
  71  |             sellingPrice: 180,
  72  |             discountPercent: 0,
  73  |           },
  74  |         ],
  75  |         payments: [{ method: 'cash', amount: 414.92 }],
  76  |         type: 'retail',
  77  |         posMode: true,
  78  |       };
  79  | 
  80  |       const res = await request.post('/api/orders', {
  81  |         headers: {
  82  |           Authorization: `Bearer ${authToken}`,
  83  |           'x-shop-id': shopId,
  84  |         },
  85  |         data: orderData,
  86  |       });
  87  |       const body = await res.json();
  88  | 
> 89  |       expect(res.status()).toBe(201);
      |                            ^ Error: expect(received).toBe(expected) // Object.is equality
  90  |       expect(body.success).toBe(true);
  91  |       expect(body.data).toHaveProperty('orderNumber');
  92  |       expect(body.data.items.length).toBe(1);
  93  |       expect(body.data.grandTotal).toBeCloseTo(414.92, 1);
  94  |       expect(body.data.paymentStatus).toBe('completed');
  95  | 
  96  |       createdOrderId = body.data._id;
  97  |     });
  98  | 
  99  |     test('should fail without auth', async ({ request }) => {
  100 |       const res = await request.post('/api/orders', {
  101 |         data: { items: [{ productId: 'fake', quantity: 1 }] },
  102 |       });
  103 |       expect(res.status()).toBe(401);
  104 |     });
  105 |   });
  106 | 
  107 |   // ─── Get Orders ───────────────────────────────────────────────────
  108 | 
  109 |   test.describe('GET /api/orders', () => {
  110 |     test('should return paginated orders', async ({ request }) => {
  111 |       const res = await request.get('/api/orders', {
  112 |         headers: {
  113 |           Authorization: `Bearer ${authToken}`,
  114 |           'x-shop-id': shopId,
  115 |         },
  116 |       });
  117 |       const body = await res.json();
  118 | 
  119 |       expect(res.status()).toBe(200);
  120 |       expect(body.success).toBe(true);
  121 |       expect(Array.isArray(body.data)).toBe(true);
  122 |       expect(body).toHaveProperty('pagination');
  123 |     });
  124 | 
  125 |     test('should support status filter', async ({ request }) => {
  126 |       const res = await request.get('/api/orders?status=completed', {
  127 |         headers: {
  128 |           Authorization: `Bearer ${authToken}`,
  129 |           'x-shop-id': shopId,
  130 |         },
  131 |       });
  132 |       const body = await res.json();
  133 | 
  134 |       expect(res.status()).toBe(200);
  135 |       expect(body.success).toBe(true);
  136 |     });
  137 |   });
  138 | 
  139 |   // ─── Get Single Order ─────────────────────────────────────────────
  140 | 
  141 |   test.describe('GET /api/orders/:id', () => {
  142 |     test('should return an order by ID', async ({ request }) => {
  143 |       test.skip(!createdOrderId, 'No order created');
  144 | 
  145 |       const res = await request.get(`/api/orders/${createdOrderId}`, {
  146 |         headers: {
  147 |           Authorization: `Bearer ${authToken}`,
  148 |           'x-shop-id': shopId,
  149 |         },
  150 |       });
  151 |       const body = await res.json();
  152 | 
  153 |       expect(res.status()).toBe(200);
  154 |       expect(body.success).toBe(true);
  155 |       expect(body.data._id).toBe(createdOrderId);
  156 |     });
  157 |   });
  158 | 
  159 |   // ─── Cancel Order ─────────────────────────────────────────────────
  160 | 
  161 |   test.describe('PUT /api/orders/:id/cancel', () => {
  162 |     test('should cancel an order', async ({ request }) => {
  163 |       test.skip(!createdOrderId, 'No order created');
  164 | 
  165 |       const res = await request.put(`/api/orders/${createdOrderId}/cancel`, {
  166 |         headers: {
  167 |           Authorization: `Bearer ${authToken}`,
  168 |           'x-shop-id': shopId,
  169 |         },
  170 |       });
  171 |       const body = await res.json();
  172 | 
  173 |       expect(res.status()).toBe(200);
  174 |       expect(body.success).toBe(true);
  175 |       expect(body.message).toContain('cancelled');
  176 |       expect(body.data.status).toBe('cancelled');
  177 |     });
  178 |   });
  179 | 
  180 |   // ─── Today Summary ────────────────────────────────────────────────
  181 | 
  182 |   test.describe('GET /api/orders/today/summary', () => {
  183 |     test('should return today order summary', async ({ request }) => {
  184 |       const res = await request.get('/api/orders/today/summary', {
  185 |         headers: {
  186 |           Authorization: `Bearer ${authToken}`,
  187 |           'x-shop-id': shopId,
  188 |         },
  189 |       });
```