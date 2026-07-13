/**
 * Role-Based Access Control (RBAC) Middleware
 *
 * Usage:
 *   authorize('super_admin')                    // Only super admin
 *   authorize('shop_admin', 'manager')          // Shop admin or manager
 *   authorizePermission('products', 'delete')   // Check specific permission
 */

const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    const userRole = req.user.role;
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role: ${allowedRoles.join(' or ')}. Your role: ${userRole}`,
      });
    }

    next();
  };
};

/**
 * Check specific permission on a resource
 * @param {string} resource - The resource name (e.g., 'products', 'orders', 'inventory')
 * @param {string} action - The action (e.g., 'create', 'read', 'update', 'delete')
 */
const authorizePermission = (resource, action) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    // Super admin and shop admin have all permissions
    if (req.user.role === 'super_admin' || req.user.role === 'shop_admin') {
      return next();
    }

    // Manager and staff check their custom permissions
    const permissions = req.user.permissions || {};
    const resourcePermissions = permissions[resource];

    if (!resourcePermissions) {
      return res.status(403).json({
        success: false,
        message: `Access denied. No permissions for resource: ${resource}`,
      });
    }

    if (!resourcePermissions[action] && !resourcePermissions.all) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required action: ${action} on ${resource}`,
      });
    }

    next();
  };
};

/**
 * Create default permissions for a role
 */
const getDefaultPermissions = (role) => {
  const defaults = {
    super_admin: {
      all: { create: true, read: true, update: true, delete: true },
    },
    shop_admin: {
      all: { create: true, read: true, update: true, delete: true },
    },
    manager: {
      products: { create: true, read: true, update: true, delete: false },
      orders: { create: true, read: true, update: true, delete: false },
      customers: { create: true, read: true, update: true, delete: false },
      inventory: { create: false, read: true, update: false, delete: false },
      reports: { create: false, read: true, update: false, delete: false },
      settings: { create: false, read: false, update: false, delete: false },
      employees: { create: false, read: true, update: false, delete: false },
    },
    staff: {
      products: { create: false, read: true, update: false, delete: false },
      orders: { create: true, read: true, update: false, delete: false },
      customers: { create: true, read: true, update: false, delete: false },
      inventory: { create: false, read: true, update: false, delete: false },
      reports: { create: false, read: false, update: false, delete: false },
      settings: { create: false, read: false, update: false, delete: false },
      employees: { create: false, read: false, update: false, delete: false },
    },
  };

  return defaults[role] || defaults.staff;
};

module.exports = { authorize, authorizePermission, getDefaultPermissions };
