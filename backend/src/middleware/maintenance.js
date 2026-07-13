/**
 * Maintenance Mode Middleware
 *
 * When maintenance mode is enabled, non-super-admin users are blocked
 * from accessing the API. Super admins can still access everything.
 *
 * Maintenance mode status is read from an environment variable:
 *   MAINTENANCE_MODE=true
 *   MAINTENANCE_MESSAGE="We are currently performing scheduled maintenance. Please check back shortly."
 *
 * Or from the system settings if stored in the database.
 */

const fs = require('fs');
const path = require('path');

// Path to maintenance flag file
const MAINTENANCE_FILE = path.join(__dirname, '..', '..', '.maintenance');

/**
 * Enable maintenance mode
 */
const enableMaintenance = (message) => {
  const content = JSON.stringify({
    enabled: true,
    message: message || 'System is under maintenance. Please try again later.',
    timestamp: new Date().toISOString(),
  });
  fs.writeFileSync(MAINTENANCE_FILE, content, 'utf-8');
};

/**
 * Disable maintenance mode
 */
const disableMaintenance = () => {
  try {
    if (fs.existsSync(MAINTENANCE_FILE)) {
      fs.unlinkSync(MAINTENANCE_FILE);
    }
  } catch (e) {
    // Ignore errors
  }
};

/**
 * Check if maintenance mode is enabled
 */
const isMaintenanceMode = () => {
  // Check env var first (runtime override)
  if (process.env.MAINTENANCE_MODE === 'true') {
    return {
      enabled: true,
      message: process.env.MAINTENANCE_MESSAGE || 'System is under maintenance. Please try again later.',
    };
  }

  // Check maintenance file
  try {
    if (fs.existsSync(MAINTENANCE_FILE)) {
      const content = fs.readFileSync(MAINTENANCE_FILE, 'utf-8');
      return JSON.parse(content);
    }
  } catch (e) {
    // Ignore errors
  }

  return { enabled: false };
};

/**
 * Express middleware to block requests during maintenance mode
 */
const maintenanceMiddleware = (req, res, next) => {
  // Skip maintenance check for health endpoint and login
  if (req.path === '/api/health' || req.path === '/api/auth/login' || 
      req.path === '/api/auth/refresh-token') {
    return next();
  }

  const maintenance = isMaintenanceMode();
  if (maintenance.enabled) {
    // Allow super admins through
    if (req.user && req.user.role === 'super_admin') {
      return next();
    }

    return res.status(503).json({
      success: false,
      message: maintenance.message || 'System is under maintenance. Please try again later.',
      code: 'MAINTENANCE_MODE',
      retryAfter: 300, // suggest retry after 5 minutes
    });
  }

  next();
};

module.exports = {
  maintenanceMiddleware,
  enableMaintenance,
  disableMaintenance,
  isMaintenanceMode,
};
