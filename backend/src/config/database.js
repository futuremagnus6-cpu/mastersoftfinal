const mongoose = require('mongoose');
const dns = require('dns');
const config = require('./index');
const logger = require('./logger');

// ─── DNS Fix for MINGW64/Git Bash environments ───
// In Git Bash (MINGW64), Node.js's default DNS resolver often fails to reach
// the Windows system DNS server (ECONNREFUSED). Explicitly setting public DNS
// servers ensures MongoDB Atlas hostnames resolve correctly.
dns.setServers(['8.8.8.8', '1.1.1.1']);

let retryTimer = null;
let retryCount = 0;
const MAX_RETRY_DELAY_MS = 30000; // Cap backoff at 30 seconds

// Register event listeners once (avoids duplicates on retries)
mongoose.connection.on('error', (err) => {
  logger.error('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  logger.warn('MongoDB disconnected. Attempting to reconnect...');
});

mongoose.connection.on('reconnected', () => {
  logger.info('MongoDB reconnected');
  retryCount = 0; // Reset retry count on successful reconnect
});

/**
 * Get current MongoDB connection status.
 * Returns: 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
 */
const getDBStatus = () => mongoose.connection.readyState;

/**
 * Drop all collections in the database (use with extreme caution).
 */
const dropAllCollections = async () => {
  if (mongoose.connection.readyState !== 1) {
    throw new Error('Database not connected. Cannot drop collections.');
  }
  const db = mongoose.connection.db;
  const collections = await db.listCollections().toArray();
  const collectionNames = collections.map((c) => c.name);

  if (collectionNames.length === 0) {
    logger.info('No collections to drop — database is already empty.');
    return [];
  }

  logger.warn(`Dropping ${collectionNames.length} collections: ${collectionNames.join(', ')}`);

  for (const name of collectionNames) {
    try {
      await db.dropCollection(name);
      logger.info(`  ✓ Dropped collection: ${name}`);
    } catch (err) {
      logger.error(`  ✗ Failed to drop ${name}: ${err.message}`);
    }
  }

  // Re-create indexes by ensuring all Mongoose models are synced
  logger.info('All collections dropped. Rebuilding indexes...');
  await mongoose.syncIndexes();
  logger.info('Indexes rebuilt successfully.');

  return collectionNames;
};

/**
 * Human-readable label for the connection status.
 */
const getDBStatusLabel = () => {
  const labels = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  return labels[mongoose.connection.readyState] || 'unknown';
};

/**
 * Connect to MongoDB with exponential backoff retry.
 * Never calls process.exit() — gracefully retries on failure.
 */
const connectDB = async () => {
  // Clear any pending retry
  if (retryTimer) {
    clearTimeout(retryTimer);
    retryTimer = null;
  }

  try {
    const conn = await mongoose.connect(config.mongodb.uri, config.mongodb.options);
    logger.info(`MongoDB Connected: ${conn.connection.host}`);
    retryCount = 0;
    return conn;
  } catch (error) {
    retryCount++;
    const delay = Math.min(1000 * Math.pow(1.5, retryCount), MAX_RETRY_DELAY_MS);
    logger.error(
      `MongoDB connection failed (attempt ${retryCount}): ${error.message}` +
      `. Retrying in ${Math.round(delay / 1000)}s...`
    );

    return new Promise((resolve) => {
      retryTimer = setTimeout(() => {
        retryTimer = null;
        resolve(connectDB());
      }, delay);
    });
  }
};

// Clean up retry timer on process shutdown
process.on('SIGTERM', () => {
  if (retryTimer) {
    clearTimeout(retryTimer);
    retryTimer = null;
  }
});

process.on('SIGINT', () => {
  if (retryTimer) {
    clearTimeout(retryTimer);
    retryTimer = null;
  }
});

module.exports = connectDB;
module.exports.getDBStatus = getDBStatus;
module.exports.getDBStatusLabel = getDBStatusLabel;
module.exports.dropAllCollections = dropAllCollections;
