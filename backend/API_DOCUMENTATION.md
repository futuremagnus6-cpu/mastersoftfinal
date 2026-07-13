# Future Magnus Business OS — API Documentation

**Base URL:** `http://localhost:5000/api`

## Authentication

All protected endpoints require a **Bearer token** in the `Authorization` header:
```
Authorization: Bearer <token>
```

### Multi-Tenant Headers (for Super Admin)
- `x-shop-id`: Specify which shop context to use
- `x-branch-id`: Specify which branch context to use

---

## 🔐 Auth — `/api/auth`

### Register
**`POST /api/auth/register`** (Public)
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+919999999999",
  "password": "John@123",
  "role": "staff"
}
```
**Response** `201`: `{ success, token, refreshToken, user }`

### Login
**`POST /api/auth/login`** (Public)
```json
{ "email": "admin@example.com", "password": "Admin@123" }
```
**Response** `200`: `{ success, token, refreshToken, user }`
**Response** `401`: `{ success: false, message: "Invalid email or password" }`
*If 2FA enabled:* `{ success, requiresTwoFactor: true, tempToken }`

### Verify 2FA
**`POST /api/auth/verify-2fa`** (Public)
```json
{ "tempToken": "..." , "otp": "123456" }
```

### Refresh Token
**`POST /api/auth/refresh-token`** (Public)
```json
{ "refreshToken": "..." }
```

### Forgot Password
**`POST /api/auth/forgot-password`** (Public)
```json
{ "email": "user@example.com" }
```

### Reset Password
**`POST /api/auth/reset-password`** (Public)
```json
{ "token": "reset-token", "password": "NewPass@123" }
```

### Get Current User
**`GET /api/auth/me`** (Auth Required)
**Response** `200`: `{ success, user }`

### Update Profile
**`PUT /api/auth/profile`** (Auth Required)
```json
{ "name": "New Name", "phone": "+919999999999", "language": "en", "theme": "light" }
```

### Change Password
**`PUT /api/auth/change-password`** (Auth Required)
```json
{ "currentPassword": "Old@123", "newPassword": "New@123" }
```

### Logout
**`POST /api/auth/logout`** (Auth Required)

### 2FA Setup
**`POST /api/auth/setup-2fa`** (Auth Required)

### 2FA Enable
**`POST /api/auth/enable-2fa`** (Auth Required)
```json
{ "token": "123456" }
```

### 2FA Disable
**`POST /api/auth/disable-2fa`** (Auth Required)

---

## 🏪 Shops — `/api/shops`

### Create Shop (Super Admin)
**`POST /api/shops`** (Auth: super_admin)
```json
{
  "name": "My Shop",
  "businessType": "grocery_store",
  "contact": { "email": "shop@example.com", "phone": "+919999999999" },
  "address": { "line1": "123 Street", "city": "Mumbai", "state": "Maharashtra", "pincode": "400001" },
  "adminEmail": "admin@shop.com",
  "password": "Admin@123",
  "isTrial": true,
  "trialDays": 14
}
```
**Response** `201`: `{ success, data: { shop, branch, admin } }`

### Register Shop (Public self-signup)
**`POST /api/shops/register`** (Public)
```json
{
  "name": "My Shop",
  "businessType": "grocery_store",
  "contact": { "email": "admin@shop.com", "phone": "+919999999999" },
  "address": { "line1": "123 Street", "city": "Mumbai", "state": "Maharashtra", "pincode": "400001" },
  "adminName": "Admin",
  "adminEmail": "admin@shop.com",
  "password": "Admin@123"
}
```

### Get Shops
**`GET /api/shops`** (Auth: super_admin, shop_admin)
Query: `?page=1&limit=20&status=active&businessType=grocery_store&search=shopname`

### Get Shop
**`GET /api/shops/:id`** (Auth: super_admin, shop_admin)

### Update Shop
**`PUT /api/shops/:id`** (Auth: super_admin, shop_admin)

### Delete Shop (soft disable)
**`DELETE /api/shops/:id`** (Auth: super_admin)

### Activate/ Suspend Shop
**`PUT /api/shops/:id/activate`** | **`PUT /api/shops/:id/suspend`** (Auth: super_admin)

### Shop Stats
**`GET /api/shops/:id/stats`** (Auth: super_admin)

### Trial Management (Super Admin)
- **`PUT /api/shops/:id/close-trial`**
- **`PUT /api/shops/:id/extend-trial`** `{ "days": 30 }`
- **`POST /api/shops/:id/send-subscription-reminder`**

### Shop Admin Password Reset
- **`POST /api/shops/:id/send-reset-link`** (Auth: super_admin)
- **`GET /api/shops/:id/admin`** (Auth: super_admin)

---

## 👥 Users — `/api/users`

All require **Auth + Multi-Tenant**.

### Get Users
**`GET /api/users`** (Auth: shop_admin, manager)
Query: `?page=1&limit=20`

### Create User
**`POST /api/users`** (Auth: shop_admin)
```json
{
  "name": "Staff Member",
  "email": "staff@shop.com",
  "phone": "+919999999999",
  "password": "Staff@123",
  "role": "staff",
  "permissions": {}
}
```

### Get / Update / Delete User
**`GET /api/users/:id`** | **`PUT /api/users/:id`** | **`DELETE /api/users/:id`**

### Update Permissions
**`PUT /api/users/:id/permissions`** (Auth: shop_admin)
```json
{ "permissions": { "products": { "read": true, "create": false } } }
```

---

## 📦 Products — `/api/products`

### Get Products
**`GET /api/products`** (Auth)
Query: `?page=1&limit=50&category=Category&search=keyword&stockStatus=low|out|in_stock&sort=name|price_asc|price_desc|stock`

### Get Product
**`GET /api/products/:id`**

### Create Product
**`POST /api/products`** (Auth)
```json
{
  "name": "Product Name",
  "sku": "SKU-001",
  "category": "Category",
  "unit": "pcs",
  "pricing": { "mrp": 100, "sellingPrice": 90, "purchasePrice": 70, "gstRate": 18 },
  "tax": { "hsnCode": "123456" },
  "inventory": { "quantity": 50, "minStockLevel": 10 }
}
```

### Update Product
**`PUT /api/products/:id`**

### Delete Product (soft)
**`DELETE /api/products/:id`**

### Update Stock
**`PUT /api/products/:id/stock`**
```json
{ "quantity": 10, "type": "add", "reason": "Restock" }
```

### Search Products (POS)
**`GET /api/products/search?q=keyword`**

### Get by Barcode
**`GET /api/products/barcode/:barcode`**

### Get Categories
**`GET /api/products/categories/list`**

### Export Products
**`GET /api/products/export`**

### Import Products
**`POST /api/products/import`** (multipart/form-data with file field "import")

---

## 👤 Customers — `/api/customers`

### Get Customers
**`GET /api/customers`**
Query: `?search=name&tier=gold&isActive=true&page=1&limit=50`

### Get Customer
**`GET /api/customers/:id`** — returns customer + orders + loyalty transactions

### Create Customer
**`POST /api/customers`**
```json
{
  "name": "Customer Name",
  "mobile": "+919999999999",
  "email": "customer@example.com",
  "gstin": "27AABCU9603R1ZM",
  "address": { "line1": "456 Street", "city": "Mumbai" },
  "creditLimit": 5000
}
```

### Update / Delete Customer
**`PUT /api/customers/:id`** | **`DELETE /api/customers/:id`**

### Search Customers (POS)
**`GET /api/customers/search?q=mobile`**

### Loyalty: Add Points
**`POST /api/customers/:id/loyalty/add`** `{ "points": 100, "description": "Purchase bonus" }`

### Loyalty: Redeem Points
**`POST /api/customers/:id/loyalty/redeem`** `{ "points": 50 }`

### Record Credit Payment
**`POST /api/customers/:id/credit/pay`** `{ "amount": 1000, "reference": "Credit payment" }`

---

## 📋 Orders — `/api/orders`

### Get Orders
**`GET /api/orders`**
Query: `?page=1&limit=50&status=completed&startDate=2024-01-01&endDate=2024-12-31&search=ordernumber`

### Create Order (POS)
**`POST /api/orders`** (Auth)
```json
{
  "customerName": "Walk-in",
  "customerMobile": "",
  "items": [
    {
      "productId": "PRODUCT_ID",
      "quantity": 2,
      "sellingPrice": 90,
      "discountPercent": 0
    }
  ],
  "payments": [{ "method": "cash", "amount": 180 }],
  "type": "retail",
  "posMode": true
}
```

### Get Order / Update Order
**`GET /api/orders/:id`** | **`PUT /api/orders/:id`**

### Cancel Order
**`PUT /api/orders/:id/cancel`**

### Generate Invoice
**`POST /api/orders/:id/generate-invoice`**

### Today's Summary
**`GET /api/orders/today/summary`**

### Sync Offline Orders
**`POST /api/orders/sync-offline`**
```json
{ "orders": [{ "offlineId": "off-001", "items": [...], ... }] }
```

---

## 📦 Inventory — `/api/inventory`

### Get Inventory Logs
**`GET /api/inventory/logs`**

### Get Stock Summary
**`GET /api/inventory/summary`**

### Get Expiring Products
**`GET /api/inventory/expiring`**

### Stock Transfers
- **`GET /api/inventory/transfers`**
- **`POST /api/inventory/transfers`** `{ "fromBranch", "toBranch", "items": [...] }`
- **`PUT /api/inventory/transfers/:id/receive`**

---

## 🚚 Suppliers — `/api/suppliers`

CRUD: **`GET/POST /api/suppliers`**, **`GET/PUT/DELETE /api/suppliers/:id`**
```json
{ "name": "Supplier Name", "contact": { "phone": "...", "email": "..." }, "address": {...} }
```

---

## 📥 Purchases — `/api/purchases`

CRUD: **`GET/POST /api/purchases`**, **`GET/PUT /api/purchases/:id`**
**`PUT /api/purchases/:id/receive`**

---

## 💰 Expenses — `/api/expenses`

CRUD: **`GET/POST /api/expenses`**, **`GET/PUT/DELETE /api/expenses/:id`**
**`PUT /api/expenses/:id/approve`**

---

## 👷 Employees — `/api/employees`

CRUD: **`GET/POST /api/employees`**, **`GET/PUT/DELETE /api/employees/:id`**

---

## 📊 Reports — `/api/reports`

(Auth: shop_admin, manager)
- **`GET /api/reports/sales`**
- **`GET /api/reports/inventory`**
- **`GET /api/reports/gst`**
- **`GET /api/reports/profit-loss`**
- **`GET /api/reports/customers`**

---

## 📈 Dashboard — `/api/dashboard`

- **`GET /api/dashboard/shop`** (Auth: shop_admin, manager, staff)
- **`GET /api/dashboard/super-admin`** (Auth: super_admin)

---

## 📊 Analytics — `/api/analytics`

- **`GET /api/analytics/revenue`**
- **`GET /api/analytics/products`**
- **`GET /api/analytics/customers`**
- **`GET /api/analytics/system-health`** (Auth: super_admin)

---

## 🔀 Branches — `/api/branches`

CRUD: **`GET/POST /api/branches`**, **`GET/PUT/DELETE /api/branches/:id`**

---

## 🤝 CRM — `/api/crm`

- **`GET /api/crm/segments`**
- **`GET /api/crm/:customerId/activity`**
- **`POST /api/crm/:customerId/notes`** `{ "note": "..." }`

---

## 🆘 Support — `/api/support`

- **`GET /api/support/stats`**
- CRUD: **`GET/POST /api/support`**, **`GET/PUT /api/support/:id`**
- **`POST /api/support/:id/messages`** `{ "message": "..." }`

---

## 🛒 E-commerce — `/api/ecommerce`

- **`GET /api/ecommerce/products`** (Public)
- **`GET /api/ecommerce/products/:id`** (Public)
- **`GET /api/ecommerce/check-pincode/:pincode`** (Public)
- **`POST /api/ecommerce/orders`** (Auth)

---

## 💳 Payments — `/api/payments`

- **`POST /api/payments/create-order`** (Auth: shop_admin, super_admin)
- **`POST /api/payments/verify`** (Auth: shop_admin, super_admin)
- **`GET /api/payments/subscription`** (Auth)
- **`GET /api/payments/plans`** (Auth)

---

## 📦 Returns/Refunds — `/api/refunds`

CRUD: **`GET/POST /api/refunds`**, **`GET/PUT/DELETE /api/refunds/:id`**
- **`PUT /api/refunds/:id/approve`**
- **`PUT /api/refunds/:id/process`**
- **`PUT /api/refunds/:id/reject`**

---

## 📎 Upload — `/api/upload`

- **`POST /api/upload`** (multipart/form-data, field: "file")
- **`POST /api/upload/multiple`** (multipart/form-data, field: "files", max 10)

---

## ⚙️ Settings — `/api/settings`

- **`GET /api/settings`**
- **`PUT /api/settings`** (Auth: shop_admin)

---

## 🔔 Notifications — `/api/notifications`

- **`GET /api/notifications`**
- **`PUT /api/notifications/:id/read`**
- **`PUT /api/notifications/read-all`**
- **`DELETE /api/notifications/:id`**

---

## 🚨 Alerts — `/api/alerts`

- **`GET /api/alerts`**
- **`GET /api/alerts/:type`**
- **`PUT /api/alerts/:type`** (Auth: shop_admin)
- **`PATCH /api/alerts/:type/toggle`** (Auth: shop_admin)

---

## 📧 Subscription Plans — `/api/subscriptions`

- **`GET /api/subscriptions/plans`** (Public)
- **`POST /api/subscriptions/plans`** (Auth: super_admin)
- **`GET /api/subscriptions/plans/:id`**
- **`PUT /api/subscriptions/plans/:id`** (Auth: super_admin)
- **`DELETE /api/subscriptions/plans/:id`** (Auth: super_admin)
- **`POST /api/subscriptions/assign`** (Auth: super_admin)
- **`GET /api/subscriptions/my-subscription`**

---

## 🎁 Loyalty — `/api/loyalty`

- **`GET /api/loyalty/tiers`**
- **`POST /api/loyalty/tiers`** (Auth: shop_admin)
- **`PUT/DELETE /api/loyalty/tiers/:id`**
- **`GET /api/loyalty/transactions`**
- **`POST /api/loyalty/transactions`**
- **`GET /api/loyalty/balance/:customerId`**
- **`GET /api/loyalty/customer-stats/:customerId`**
- **`POST /api/loyalty/earn-from-order`**
- **`GET/PUT /api/loyalty/settings`**

---

## 🔑 API Keys — `/api/api-keys`

CRUD: **`GET/POST /api/api-keys`**, **`GET/PUT/DELETE /api/api-keys/:id`**
**`POST /api/api-keys/:id/regenerate`**

---

## Webhooks — `/api/webhooks`

CRUD: **`GET/POST /api/webhooks`**, **`GET/PUT/DELETE /api/webhooks/:id`**
- **`PUT /api/webhooks/:id/toggle`**
- **`POST /api/webhooks/:id/test`**

---

## 💾 Backups — `/api/backups`

CRUD: **`GET/POST /api/backups`**, **`GET/DELETE /api/backups/:id`**
**`POST /api/backups/:id/restore`**

---

## 🔄 Migrations — `/api/migrations`

- **`POST /api/migrations/export`** (Auth: shop_admin)
- **`POST /api/migrations/import`** (Auth: shop_admin)
- **`GET /api/migrations/status`** (Auth: shop_admin)

---

## 🤝 Referrals — `/api/referrals`

- **`GET /api/referrals/stats`**
- CRUD: **`GET/POST /api/referrals`**, **`GET/PUT/DELETE /api/referrals/:id`**

---

## 💬 WhatsApp — `/api/whatsapp`

- **`POST /api/whatsapp/send`**
- **`GET /api/whatsapp/templates`**
- **`POST /api/whatsapp/verify`** (Auth: shop_admin)

---

## 📧 Contact/Enquiries — `/api/contact`

- **`POST /api/contact`** (Public)
- **`GET /api/contact`** (Auth: super_admin)
- **`GET /api/contact/stats`** (Auth: super_admin)
- **`GET/PUT /api/contact/:id`** (Auth: super_admin)

---

## 🏥 Health Check

**`GET /api/health`** (Public)
```json
{
  "success": true,
  "message": "Future Magnus Business OS API is running",
  "environment": "test",
  "database": { "status": 1, "label": "connected" },
  "timestamp": "..."
}
```

---

## Common Response Formats

### Success
```json
{ "success": true, "message": "...", "data": { ... }, "pagination": { "page": 1, "limit": 20, "total": 100, "pages": 5 } }
```

### Error
```json
{ "success": false, "message": "Error description" }
```

### Paginated Response
```json
{ "success": true, "data": [...], "pagination": { "page": 1, "limit": 50, "total": 200, "pages": 4 } }
```

## HTTP Status Codes
| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request / Validation Error |
| 401 | Unauthorized |
| 403 | Forbidden (RBAC) |
| 404 | Not Found |
| 409 | Conflict (Duplicate) |
| 423 | Locked (Account locked) |
| 500 | Internal Server Error |
| 503 | Database Unavailable |
