const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

// Warn if JWT secrets are using fallback defaults
if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'fallback-secret-change-me') {
  const msg = '⚠️  JWT_SECRET is using a weak fallback. Set a strong random value in .env for production. Use: node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"';
  if (process.env.NODE_ENV === 'production') {
    console.error(`[FATAL] ${msg}`);
    process.exit(1);
  } else {
    console.warn(`[WARN] ${msg}`);
  }
}
if (!process.env.JWT_REFRESH_SECRET || process.env.JWT_REFRESH_SECRET === 'fallback-refresh-secret-change-me') {
  const msg = '⚠️  JWT_REFRESH_SECRET is using a weak fallback. Set a strong random value in .env for production.';
  if (process.env.NODE_ENV === 'production') {
    console.error(`[FATAL] ${msg}`);
    process.exit(1);
  } else {
    console.warn(`[WARN] ${msg}`);
  }
}

const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 5000,

  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://mongo:ChiMoFiVxeveMinpjoqdeOvmrazRwUUJ@tokaido.proxy.rlwy.net:54749',
    options: {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    },
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'fallback-secret-change-me',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret-change-me',
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },

  email: {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT, 10) || 587,
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.EMAIL_FROM || 'noreply@futuremagnus.com',
  },

  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID,
    keySecret: process.env.RAZORPAY_KEY_SECRET,
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET,
  },

  aws: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION || 'ap-south-1',
    bucket: process.env.AWS_BUCKET_NAME || 'magnus-backups',
  },

  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',

  superAdmin: {
    email: process.env.SUPER_ADMIN_EMAIL,
    password: process.env.SUPER_ADMIN_PASSWORD,
    phone: process.env.SUPER_ADMIN_PHONE,
  },

  gst: {
    rates: [0, 5, 12, 18, 28],
    ewayBillThreshold: 50000,
  },
};

module.exports = config;
