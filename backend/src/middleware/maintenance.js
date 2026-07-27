/**
 * Maintenance Mode Middleware
 *
 * When maintenance mode is enabled, non-super-admin users are blocked
 * from accessing the API. Super admins can still access everything.
 *
 * Maintenance mode status is read from:
 *   1. PlatformConfig database (set via Super Admin Settings)
 *   2. MAINTENANCE_MODE environment variable (runtime override)
 *   3. .maintenance file (legacy file-based flag)
 */

const fs = require('fs');
const path = require('path');
const PlatformConfig = require('../models/PlatformConfig');

// Path to maintenance flag file
const MAINTENANCE_FILE = path.join(__dirname, '..', '..', '.maintenance');

/**
 * Enable maintenance mode
 */
const enableMaintenanceFile = (message) => {
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
const disableMaintenanceFile = () => {
  try {
    if (fs.existsSync(MAINTENANCE_FILE)) {
      fs.unlinkSync(MAINTENANCE_FILE);
    }
  } catch (e) {
    // Ignore errors
  }
};

/**
 * Check if maintenance mode is enabled from all sources
 */
const isMaintenanceMode = () => {
  // 1. Check env var first (runtime override)
  if (process.env.MAINTENANCE_MODE === 'true') {
    return {
      enabled: true,
      message: process.env.MAINTENANCE_MESSAGE || 'System is under maintenance. Please try again later.',
    };
  }

  // 2. Check maintenance file
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
const maintenanceMiddleware = async (req, res, next) => {
  // Skip maintenance check for health endpoint and login
  if (req.path === '/api/health' || req.path === '/api/auth/login' || 
      req.path === '/api/auth/refresh-token' || req.path === '/api/auth/forgot-password' ||
      req.path === '/api/auth/reset-password' || req.path === '/api/platform-config/status') {
    return next();
  }

  // Check file/env based maintenance first (fast, no DB call)
  const fileMaintenance = isMaintenanceMode();
  if (fileMaintenance.enabled) {
    if (req.user && req.user.role === 'super_admin') {
      return next();
    }
    return res.status(503).json({
      success: false,
      message: fileMaintenance.message || 'System is under maintenance. Please try again later.',
      code: 'MAINTENANCE_MODE',
      retryAfter: 300,
    });
  }

  // Check database-based maintenance (from PlatformConfig)
  try {
    const config = await PlatformConfig.getConfig();
    if (config && config.maintenanceMode) {
      if (req.user && req.user.role === 'super_admin') {
        return next();
      }
      return res.status(503).json({
        success: false,
        message: 'The site is currently under maintenance. Please check back later.',
        code: 'MAINTENANCE_MODE',
        retryAfter: 300,
      });
    }
  } catch (e) {
    // If DB is unavailable, continue without maintenance check
  }

  next();
};

module.exports = {
  maintenanceMiddleware,
  enableMaintenance: enableMaintenanceFile,
  disableMaintenance: disableMaintenanceFile,
  isMaintenanceMode,
};
