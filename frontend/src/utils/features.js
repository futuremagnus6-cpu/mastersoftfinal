/**
 * Feature-based access control for Shop Admin modules.
 *
 * Maps each subscription plan feature to its corresponding
 * sidebar navigation items. Features not present in the plan
 * will hide the associated menu items and routes.
 *
 * Usage:
 *   import { isFeatureEnabled, getEnabledMenuItems, FEATURE_MAP } from '../../utils/features';
 *   const enabled = isFeatureEnabled(shopFeatures, 'pos');
 *   const visibleItems = getEnabledMenuItems(allItems, shopFeatures);
 */

// Mapping of feature keys to their labels (for display)
export const FEATURE_LABELS = {
  pos: 'POS Terminal',
  inventory: 'Inventory Management',
  crm: 'CRM / Customer Management',
  suppliers: 'Supplier Management',
  purchases: 'Purchase Management',
  expenses: 'Expense Tracking',
  employees: 'Employee Management',
  multiBranch: 'Multi-Branch Support',
  loyalty: 'Loyalty Program',
  ecommerce: 'E-Commerce Integration',
  customerPortal: 'Customer Portal',
  referralSystem: 'Referral System',
  aiForecasting: 'AI Demand Forecasting',
  barcodeScanner: 'Barcode Scanner',
  thermalPrinter: 'Thermal Printer Support',
  whatsappNotifications: 'WhatsApp Notifications',
  emailNotifications: 'Email Notifications',
  lowStockAlerts: 'Low Stock Alerts',
  expiryAlerts: 'Expiry Alerts',
  gstModule: 'GST Module',
  offlinePos: 'Offline POS Mode',
  autoBackup: 'Auto Backup',
  multiLanguage: 'Multi-Language Support',
};

/**
 * Check if a specific feature is enabled in the shop's subscription plan.
 *
 * @param {Object|null} shopFeatures - The shop features object from Redux store
 * @param {string} featureKey - The feature key to check (e.g. 'pos', 'inventory')
 * @returns {boolean} - Whether the feature is enabled
 */
export function isFeatureEnabled(shopFeatures, featureKey) {
  if (!shopFeatures || !shopFeatures.features) return true; // Default: show everything if features aren't loaded
  return shopFeatures.features[featureKey] === true;
}

/**
 * Filter an array of menu items based on enabled shop features.
 * Each menu item can specify a `feature` property that maps to a subscription feature key.
 * Items without a `feature` property are always shown.
 *
 * @param {Array} menuItems - Array of menu item objects (with optional `feature` string)
 * @param {Object|null} shopFeatures - Shop features from Redux store
 * @returns {Array} - Filtered menu items
 */
export function getEnabledMenuItems(menuItems, shopFeatures) {
  if (!shopFeatures || !shopFeatures.features) return menuItems;

  return menuItems.filter((item) => {
    // If the item has a feature requirement, check it
    if (item.feature) {
      return shopFeatures.features[item.feature] === true;
    }
    // Items without a feature requirement are always shown
    return true;
  });
}

export default {
  isFeatureEnabled,
  getEnabledMenuItems,
  FEATURE_LABELS,
};
