# Future Magnus Business OS — Full Project Documentation

## Overview

**Future Magnus Business OS (v2.0)** is a full-stack, production-ready SaaS ERP/POS platform designed for Indian retail businesses. It supports multi-tenant shop management with role-based access, GST compliance, inventory tracking, and a full point-of-sale terminal.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18, Vite 5, Tailwind CSS 3 |
| **State Management** | Redux Toolkit |
| **Routing** | React Router v6 |
| **Backend** | Node.js, Express 4 |
| **Database** | MongoDB (Mongoose 8) |
| **Authentication** | JWT + Refresh Tokens |
| **Real-time** | Socket.io |
| **Payments** | Razorpay |
| **Email** | Nodemailer (SMTP) |
| **File Upload** | Multer |
| **Charts** | Recharts, Chart.js |
| **Testing** | Playwright (API tests) |
| **Background Jobs** | BullMQ + Redis |
| **Logging** | Winston |
| **PDF Generation** | PDFKit |
| **Barcode** | JsBarcode |
| **Internationalization** | i18next |

---

## Project Structure

```
future-magnus-bos/
├── backend/                          # Express API server (port 5000)
│   ├── src/
│   │   ├── config/                   # DB, logger, env config
│   │   ├── controllers/              # 30+ route handlers
│   │   ├── middleware/               # auth, RBAC, multi-tenant, upload, error handler
│   │   ├── models/                   # 20+ Mongoose schemas
│   │   ├── routes/                   # Express routers
│   │   ├── services/                 # Email, expiry notifications
│   │   └── utils/                    # Barcode, GST, invoice generators
│   ├── uploads/                      # Uploaded files (images, imports, invoices)
│   ├── scripts/                      # Seed, deploy, DB reset
│   ├── test/                         # Jest tests
│   ├── server.js                     # Entry point
│   ├── API_DOCUMENTATION.md
│   └── DEPLOYMENT.md
│
├── frontend/                         # React SPA (port 5173)
│   ├── src/
│   │   ├── components/layout/        # AppLayout, Sidebar, Navbar
│   │   ├── pages/                    # 30+ lazy-loaded pages
│   │   ├── store/slices/             # authSlice, shopSlice, uiSlice
│   │   ├── services/api.js           # Axios instance + all API methods
│   │   └── styles/index.css          # Tailwind CSS
│   ├── tests/api/                    # Playwright API tests (19 tests)
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── playwright.config.js
│
├── package.json                      # Root monorepo scripts
├── package-lock.json
└── PROJECT_DOCUMENTATION.md          # This file
```

---

## Getting Started

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)
- npm

### Installation

```bash
git clone <repo-url>
cd future-magnus-bos
npm install
cp backend/deploy.env.example backend/.env
# Edit backend/.env with your values (MongoDB URI, JWT secrets, etc.)
npm run seed
```

### Running Locally

```bash
npm run dev              # Both backend + frontend
npm run dev:backend      # Backend only (port 5000)
npm run dev:frontend     # Frontend only (port 5173)
```

### Running Tests

```bash
cd frontend
npx playwright test tests/api/                        # All 19 tests
npx playwright test tests/api/products.spec.js        # Products (12 tests)
npx playwright test tests/api/orders.spec.js          # Orders (7 tests)
```

### Building for Production

```bash
npm run build   # Builds frontend to frontend/dist
```

---

## Architecture & Key Concepts

### Multi-Tenancy
Every record in the database is scoped to a shopId. The multiTenant middleware extracts the shop context from the authenticated user or the x-shop-id header (for super admins).

### Authentication Flow
1. User logs in → receives JWT + refresh token
2. JWT sent via Authorization: Bearer header
3. Auto-refresh on expiry (401 interceptor)
4. Refresh fails → redirect to /login

### Role-Based Access Control (RBAC)
| Role | Permissions |
|------|-------------|
| super_admin | Full platform access: manage shops, plans, analytics, system settings |
| shop_admin | Full store access: products, POS, orders, customers, employees, settings |
| manager | Limited CRUD: create products/orders/customers, view reports/inventory |
| staff | Read products, use POS, create orders, view customers |

### GST Compliance
- Rates: 0%, 5%, 12%, 18%, 28%
- GST-inclusive pricing by default (togglable in POS)
- CGST/SGST split (50/50) for intra-state
- HSN/SAC code tracking
- B2B vs B2C invoice type based on customer GSTIN

---

## Frontend Routes

### Public Routes
| Path | Page |
|------|------|
| / | Landing page (unauthenticated) or App (authenticated) |
| /login | Login page |
| /signup | Shop registration |
| /login/2fa | Two-factor authentication |
| /forgot-password | Password reset request |
| /reset-password | Password reset form |

### Shop Admin Routes (role: shop_admin, manager, staff)
| Path | Roles | Page |
|------|-------|------|
| / | All | Dashboard |
| /pos | All | POS Terminal |
| /products | All | Products (CRUD, import/export, image upload) |
| /customers | All | Customers |
| /orders | All | Orders |
| /inventory | admin, manager | Inventory |
| /suppliers | admin, manager | Suppliers |
| /purchases | admin, manager | Purchases |
| /expenses | admin, manager | Expenses |
| /team | admin | Team Management |
| /employees | admin | Employees |
| /loyalty | admin | Loyalty Program |
| /reports | admin, manager | Reports |
| /alerts | admin, manager | Alerts |
| /billing | admin | Billing |
| /settings | admin | Settings |

### Super Admin Routes (role: super_admin)
| Path | Page |
|------|------|
| /super-admin | Dashboard |
| /super-admin/shops | Shop Management |
| /super-admin/pre-shops | Pre-Shops (Trials) |
| /super-admin/plans | Subscription Plans |
| /super-admin/analytics | Platform Analytics |
| /super-admin/settings | System Settings |

---

## Key API Endpoints
Full API docs: backend/API_DOCUMENTATION.md

| Module | Key Endpoints | Auth |
|--------|---------------|------|
| Auth | POST /api/auth/login, /register, /me, /logout, /refresh-token | Public/Auth |
| Shops | GET/POST /api/shops, PUT /api/shops/:id/activate, /close-trial, /extend-trial | super_admin |
| Products | GET/POST /api/products, GET /api/products/search, GET /api/products/barcode/:barcode | Auth |
| Orders | GET/POST /api/orders, PUT /api/orders/:id/cancel, GET /api/orders/today/summary | Auth |
| Customers | GET/POST /api/customers, GET /api/customers/search | Auth |
| Upload | POST /api/upload (multipart, field: file) | Auth |
| Dashboard | GET /api/dashboard/shop, GET /api/dashboard/super-admin | Auth |
| Health | GET /api/health | Public |

---

## Key Mongoose Models

### User
name, email, phone, password (bcrypt), role, shopId, branchId, permissions, isActive, isVerified, twoFactorEnabled, loginAttempts, lockUntil, refreshToken

### Shop
name, businessType, gstin, pan, address, contact, subscription: { plan, status, trialEndsAt }, status (active|inactive|suspended|disabled)

### Product
name, sku (unique per shop), barcode, category, pricing: { mrp, sellingPrice, purchasePrice, gstRate, gstInclusive }, tax: { hsnCode }, inventory: { quantity, minStockLevel }, images: [{ url, type: upload|link, isMain }], batchTracking, batches[]

### Order
orderNumber (auto: MAG-YYYYMM-XXXXX), customerName, items[], subtotal, totalDiscount, totalGst, totalCgst, totalSgst, grandTotal, payments[], paymentStatus (completed|partial|pending), status, posMode

### AuditLog
shopId, user, action (create|update|delete|read|login|logout|export|import|transfer|payment|send_password_reset|close_trial|extend_trial|send_subscription_reminder), resource, description, ip

---

## Environment Variables

### Required
| Variable | Description |
|----------|-------------|
| NODE_ENV | development, production, or test |
| PORT | Server port (default: 5000) |
| MONGODB_URI | MongoDB connection string |
| JWT_SECRET | JWT signing secret (64+ char hex) |
| JWT_REFRESH_SECRET | Refresh token secret |
| FRONTEND_URL | CORS origin (default: http://localhost:5173) |

### Optional
| Variable | Description |
