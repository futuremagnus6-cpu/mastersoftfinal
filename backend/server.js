const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const {
  createAuthIpLimiter,
  createAuthAccountLimiter,
  createPublicLimiter,
  createApiLimiter,
} = require('./src/middleware/rateLimiter');
const path = require('path');

const config = require('./src/config');
const logger = require('./src/config/logger');
const connectDB = require('./src/config/database');
const { getDBStatus, getDBStatusLabel } = connectDB;
const errorHandler = require('./src/middleware/errorHandler');
const { maintenanceMiddleware } = require('./src/middleware/maintenance');
const { initExpiryNotifications } = require('./src/services/expiryNotificationService');

// Import Routes
const authRoutes = require('./src/routes/auth.routes');
const shopRoutes = require('./src/routes/shop.routes');
const userRoutes = require('./src/routes/user.routes');
const productRoutes = require('./src/routes/product.routes');
const customerRoutes = require('./src/routes/customer.routes');
const orderRoutes = require('./src/routes/order.routes');
const inventoryRoutes = require('./src/routes/inventory.routes');
const supplierRoutes = require('./src/routes/supplier.routes');
const purchaseRoutes = require('./src/routes/purchase.routes');
const expenseRoutes = require('./src/routes/expense.routes');
const employeeRoutes = require('./src/routes/employee.routes');
const subscriptionRoutes = require('./src/routes/subscription.routes');
const loyaltyRoutes = require('./src/routes/loyalty.routes');
const alertRoutes = require('./src/routes/alert.routes');
const notificationRoutes = require('./src/routes/notification.routes');
const reportRoutes = require('./src/routes/report.routes');
const dashboardRoutes = require('./src/routes/dashboard.routes');
const analyticsRoutes = require('./src/routes/analytics.routes');
const branchRoutes = require('./src/routes/branch.routes');
const crmRoutes = require('./src/routes/crm.routes');
const supportRoutes = require('./src/routes/support.routes');
const ecommerceRoutes = require('./src/routes/ecommerce.routes');
const refundRoutes = require('./src/routes/refund.routes');
const uploadRoutes = require('./src/routes/upload.routes');
const settingsRoutes = require('./src/routes/settings.routes');
const webhookRoutes = require('./src/routes/webhook.routes');
const apiKeyRoutes = require('./src/routes/apiKey.routes');
const backupRoutes = require('./src/routes/backup.routes');
const migrationRoutes = require('./src/routes/migration.routes');
const referralRoutes = require('./src/routes/referral.routes');
const whatsappRoutes = require('./src/routes/whatsapp.routes');
const contactRoutes = require('./src/routes/contact.routes');
const paymentRoutes = require('./src/routes/payment.routes');
const platformConfigRoutes = require('./src/routes/platformConfig.routes');

const app = express();
const server = http.createServer(app);

// ─── Socket.io ───
const io = new Server(server, {
  cors: {
    origin: config.frontendUrl,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Make io accessible to routes
app.set('io', io);

// ─── Security Middleware ───
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: config.frontendUrl,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key', 'x-shop-id', 'x-branch-id'],
}));

// ─── Rate Limiting ───

// Auth routes: per-IP + per-account with exponential backoff
const authIpLimiter = createAuthIpLimiter();
const authAccountLimiter = createAuthAccountLimiter();

// Public endpoints: moderate limits
const publicLimiter = createPublicLimiter();

// Authenticated API routes: looser limits
const apiLimiter = createApiLimiter();

app.use('/api/auth/login', authIpLimiter, authAccountLimiter);
app.use('/api/auth/register', authIpLimiter, authAccountLimiter);
app.use('/api/auth/forgot-password', authIpLimiter, authAccountLimiter);
app.use('/api/auth/reset-password', authIpLimiter, authAccountLimiter);
app.use('/api/auth/verify-2fa', authIpLimiter, authAccountLimiter);

// Public routes (health check, contact, etc.)
app.use('/api/health', publicLimiter);
app.use('/api/contact', publicLimiter);

// All other API routes get the standard API limiter
app.use('/api/', apiLimiter);

// Razorpay webhook signatures require the exact raw request body.
app.use('/api/payments/razorpay/webhook', express.raw({ type: 'application/json', limit: '2mb' }));

// ─── Maintenance Mode ───
app.use(maintenanceMiddleware);

// ─── Body Parsing ───
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(compression());

// ─── Logging ───
if (config.env !== 'test') {
  app.use(morgan('combined', { stream: { write: (message) => logger.info(message.trim()) } }));
}

// ─── Static Files ───
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ─── Health Check ───
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Future Magnus Business OS API is running',
    environment: config.env,
    database: {
      status: getDBStatus(),
      label: getDBStatusLabel(),
    },
    timestamp: new Date().toISOString(),
  });
});

// ─── DB Availability Middleware ───
// Returns a clear error instead of letting Mongoose buffer and time out
app.use('/api', (req, res, next) => {
  if (getDBStatus() !== 1) {
    return res.status(503).json({
      success: false,
      message: 'Database is not connected. The server is automatically retrying. Please try again in a moment.',
      code: 'DB_UNAVAILABLE',
      database: {
        status: getDBStatus(),
        label: getDBStatusLabel(),
      },
    });
  }
  next();
});

// ─── API Routes ───
app.use('/api/auth', authRoutes);
app.use('/api/shops', shopRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/purchases', purchaseRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/loyalty', loyaltyRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/branches', branchRoutes);
app.use('/api/crm', crmRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/ecommerce', ecommerceRoutes);
app.use('/api/refunds', refundRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/api-keys', apiKeyRoutes);
app.use('/api/backups', backupRoutes);
app.use('/api/migrations', migrationRoutes);
app.use('/api/referrals', referralRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/platform-config', platformConfigRoutes);

  // ─── 404 Handler ───
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

// ─── Error Handler ───
app.use(errorHandler);

// ─── Socket.io Connection ───
io.on('connection', (socket) => {
  logger.info(`Socket connected: ${socket.id}`);

  socket.on('join-shop', (shopId) => {
    socket.join(`shop:${shopId}`);
    logger.info(`Socket ${socket.id} joined shop:${shopId}`);
  });

  socket.on('join-branch', (branchId) => {
    socket.join(`branch:${branchId}`);
    logger.info(`Socket ${socket.id} joined branch:${branchId}`);
  });

  socket.on('disconnect', () => {
    logger.info(`Socket disconnected: ${socket.id}`);
  });
});

// ─── Start Server ───
const startServer = () => {
  // Start HTTP server immediately — don't block on DB connection
  server.listen(config.port, () => {
    logger.info(`
╔══════════════════════════════════════════════╗
║     FUTURE MAGNUS BUSINESS OS — v2.0        ║
║     Server running on port ${config.port.toString().padEnd(22)}║
║     Environment: ${config.env.padEnd(31)}║
║     ${new Date().toISOString().padEnd(42)}║
╚══════════════════════════════════════════════╝
    `);
  });

  // Connect to MongoDB in the background with retries
  connectDB();

  // Initialize expiry notification cron jobs
  initExpiryNotifications();
};

// Don't start server automatically in test mode — supertest manages its own lifecycle
if (config.env !== 'test') {
  startServer();
}

module.exports = { app, server, io };
