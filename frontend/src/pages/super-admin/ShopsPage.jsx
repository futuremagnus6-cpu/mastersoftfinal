import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  FiSearch, FiPlus, FiEye, FiToggleLeft, FiToggleRight,
  FiTrash2, FiRefreshCw, FiX, FiFilter, FiChevronLeft,
  FiChevronRight, FiShoppingBag, FiMail, FiPhone,
  FiMapPin, FiCalendar, FiDollarSign, FiUsers, FiKey,
  FiEdit2, FiClock,
  FiCheckSquare, FiSquare, FiCpu, FiServer, FiLayers,
  FiGift, FiGlobe, FiTrendingUp, FiSmartphone,
  FiPrinter, FiMessageSquare, FiBell, FiAlertTriangle,
  FiFileText, FiWifi, FiDownload, FiCreditCard, FiSend,
} from 'react-icons/fi';
import { apiService } from '../../services/api';
import toast from 'react-hot-toast';

// ─── Status Badge ───
function StatusBadge({ status }) {
  const colors = {
    active: 'badge-success',
    inactive: 'badge-warning',
    suspended: 'badge-danger',
    disabled: 'badge-info',
    trial: 'badge-info',
  };
  return <span className={colors[status] || 'badge-info'}>{status}</span>;
}

// ─── Create/Edit Shop Modal ───
function ShopModal({ shop, onClose, onSave }) {
  const [form, setForm] = useState({
    name: shop?.name || '',
    businessType: shop?.businessType || 'grocery_store',
    customBusinessType: shop?.customBusinessType || '',
    gstin: shop?.gstin || '',
    pan: shop?.pan || '',
    subscriptionPlan: shop?.subscriptionPlan?._id || '',
    adminPassword: '',
    isTrial: shop?._id ? false : true,
    trialDays: 14,
    contact: {
      email: shop?.contact?.email || '',
      phone: shop?.contact?.phone || '',
      website: shop?.contact?.website || '',
    },
    address: {
      line1: shop?.address?.line1 || '',
      line2: shop?.address?.line2 || '',
      city: shop?.address?.city || '',
      state: shop?.address?.state || '',
      pincode: shop?.address?.pincode || '',
      country: shop?.address?.country || 'India',
    },
  });
  const [features, setFeatures] = useState({
    // Core
    pos: shop?.features?.pos ?? true,
    inventory: shop?.features?.inventory ?? true,
    crm: shop?.features?.crm ?? false,
    suppliers: shop?.features?.suppliers ?? false,
    purchases: shop?.features?.purchases ?? false,
    expenses: shop?.features?.expenses ?? false,
    employees: shop?.features?.employees ?? false,
    // Advanced
    multiBranch: shop?.features?.multiBranch ?? false,
    loyalty: shop?.features?.loyalty ?? false,
    ecommerce: shop?.features?.ecommerce ?? false,
    customerPortal: shop?.features?.customerPortal ?? false,
    referralSystem: shop?.features?.referralSystem ?? false,
    aiForecasting: shop?.features?.aiForecasting ?? false,
    // Tools/Integrations
    barcodeScanner: shop?.features?.barcodeScanner ?? false,
    thermalPrinter: shop?.features?.thermalPrinter ?? false,
    whatsappNotifications: shop?.features?.whatsappNotifications ?? false,
    emailNotifications: shop?.features?.emailNotifications ?? true,
    lowStockAlerts: shop?.features?.lowStockAlerts ?? true,
    expiryAlerts: shop?.features?.expiryAlerts ?? true,
    gstModule: shop?.features?.gstModule ?? true,
    customerSupport: shop?.features?.customerSupport ?? false,
    // Settings-based
    offlinePos: shop?.settings?.offlinePos ?? false,
    autoBackup: shop?.settings?.autoBackup ?? false,
    multiLanguage: shop?.settings?.multiLanguage ?? false,
  });

  // Feature definition groups for UI display
  const featureGroups = [
    {
      title: 'Core Features',
      icon: FiCpu,
      items: [
        { key: 'pos', label: 'POS Terminal', description: 'Point of Sale terminal with billing and payments' },
        { key: 'inventory', label: 'Inventory Management', description: 'Stock tracking, transfers, and low stock alerts' },
        { key: 'crm', label: 'CRM / Customer Management', description: 'Customer profiles, history, and segmentation' },
        { key: 'suppliers', label: 'Supplier Management', description: 'Supplier directory and purchase orders' },
        { key: 'purchases', label: 'Purchase Management', description: 'Purchase orders, GRN, and vendor payments' },
        { key: 'expenses', label: 'Expense Tracking', description: 'Expense logging, categories, and approvals' },
        { key: 'employees', label: 'Employee Management', description: 'Staff roles, attendance, and permissions' },
      ],
    },
    {
      title: 'Advanced Features',
      icon: FiLayers,
      items: [
        { key: 'multiBranch', label: 'Multi-Branch Support', description: 'Manage multiple branches with centralized reporting' },
        { key: 'loyalty', label: 'Loyalty Program', description: 'Points, tiers, and rewards for customers' },
        { key: 'ecommerce', label: 'E-Commerce Integration', description: 'Online store integration and order sync' },
        { key: 'customerPortal', label: 'Customer Portal', description: 'Self-service portal for customers' },
        { key: 'referralSystem', label: 'Referral System', description: 'Referral tracking and rewards' },
        { key: 'aiForecasting', label: 'AI Demand Forecasting', description: 'AI-powered demand prediction and analytics' },
      ],
    },
    {
      title: 'Integrations & Tools',
      icon: FiSmartphone,
      items: [
        { key: 'barcodeScanner', label: 'Barcode Scanner', description: 'Barcode scanning for quick product lookup' },
        { key: 'thermalPrinter', label: 'Thermal Printer Support', description: 'Thermal receipt printer integration' },
        { key: 'gstModule', label: 'GST Module', description: 'GST-compliant invoicing and reports' },
        { key: 'offlinePos', label: 'Offline POS Mode', description: 'Continue selling even without internet' },
        { key: 'customerSupport', label: 'Customer Support', description: 'Built-in support ticket system' },
      ],
    },
    {
      title: 'Notifications & Alerts',
      icon: FiBell,
      items: [
        { key: 'whatsappNotifications', label: 'WhatsApp Notifications', description: 'Send order updates via WhatsApp' },
        { key: 'emailNotifications', label: 'Email Notifications', description: 'Email alerts for orders and activities' },
        { key: 'lowStockAlerts', label: 'Low Stock Alerts', description: 'Automatic alerts when stock runs low' },
        { key: 'expiryAlerts', label: 'Expiry Alerts', description: 'Alerts for products nearing expiry' },
      ],
    },
    {
      title: 'System Settings',
      icon: FiServer,
      items: [
        { key: 'autoBackup', label: 'Auto Backup', description: 'Automatic scheduled database backups' },
        { key: 'multiLanguage', label: 'Multi-Language Support', description: 'Support for Hindi, Marathi, Gujarati & more' },
      ],
    },
  ];

  // Toggle a single feature
  const toggleFeature = (key) => {
    setFeatures(prev => ({ ...prev, [key]: !prev[key] }));
  };
  const [saving, setSaving] = useState(false);
  const [plans, setPlans] = useState([]);
  const [plansLoading, setPlansLoading] = useState(true);

  // Load subscription plans on mount
  useEffect(() => {
    const loadPlans = async () => {
      try {
        const response = await apiService.getPlans();
        if (response.data && Array.isArray(response.data.data)) {
          setPlans(response.data.data.filter(p => p.isActive));
        }
      } catch (err) {
        console.error('Failed to load plans:', err);
      } finally {
        setPlansLoading(false);
      }
    };
    loadPlans();
  }, []);

  const businessTypes = [
    { value: 'medical_store', label: 'Medical Store' },
    { value: 'pharmacy', label: 'Pharmacy' },
    { value: 'distributor', label: 'Distributor' },
    { value: 'grocery_store', label: 'Grocery Store' },
    { value: 'supermarket', label: 'Supermarket' },
    { value: 'electronics_shop', label: 'Electronics Shop' },
    { value: 'mobile_shop', label: 'Mobile Shop' },
    { value: 'cosmetics_shop', label: 'Cosmetics Shop' },
    { value: 'hardware_shop', label: 'Hardware Shop' },
    { value: 'riyansh_mlm', label: 'Riyansh MLM' },
    { value: 'custom', label: 'Custom' },
  ];

  const handleChange = (section, field, value) => {
    if (section) {
      setForm(prev => ({
        ...prev,
        [section]: { ...prev[section], [field]: value },
      }));
    } else {
      setForm(prev => ({ ...prev, [field]: value }));
    }
  };

  // Separate features that belong to settings vs features
  const settingsFeatureKeys = ['offlinePos', 'autoBackup', 'multiLanguage'];

  const getFeaturesPayload = () => {
    const fPayload = {};
    const sPayload = {};
    Object.entries(features).forEach(([key, value]) => {
      if (settingsFeatureKeys.includes(key)) {
        sPayload[key] = value;
      } else {
        fPayload[key] = value;
      }
    });
    return { features: fPayload, settings: sPayload };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { features: featuresPayload, settings: settingsPayload } = getFeaturesPayload();
      const payload = {
        ...form,
        features: featuresPayload,
        settings: { ...form.settings, ...settingsPayload },
      };
      // Only send password when creating a new shop
      if (shop) {
        delete payload.adminPassword;
        delete payload.adminEmail;
        delete payload.isTrial;
        delete payload.trialDays;
      } else if (!payload.adminPassword) {
        delete payload.adminPassword;
      }
      if (shop) {
        await apiService.updateShop(shop._id, payload);
        toast.success('Shop updated successfully');
      } else {
        await apiService.createShop(payload);
        toast.success('Shop created successfully');
      }
      onSave();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save shop');
    } finally {
      setSaving(false);
    }
  };

  // ─── Feature Toggle Component ───
  function FeatureToggle({ item }) {
    const enabled = features[item.key];
    return (
      <div
        className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all ${
          enabled
            ? 'bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800'
            : 'bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
        }`}
        onClick={() => toggleFeature(item.key)}
      >
        <div className="flex-1 min-w-0 pr-3">
          <div className="flex items-center gap-2">
            <span className={`text-sm font-medium ${enabled ? 'text-primary-700 dark:text-primary-300' : 'text-gray-700 dark:text-gray-300'}`}>
              {item.label}
            </span>
            {enabled && (
              <span className="text-xs px-1.5 py-0.5 bg-primary-100 dark:bg-primary-800 text-primary-700 dark:text-primary-300 rounded">ON</span>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-0.5">{item.description}</p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer shrink-0" onClick={e => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={enabled}
            onChange={() => toggleFeature(item.key)}
            className="sr-only peer"
          />
          <div className="w-10 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-500 peer-checked:bg-primary-600"></div>
        </label>
      </div>
    );
  }

  // ─── Feature Group Component ───
  function FeatureGroup({ group }) {
    return (
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
          <group.icon className="w-4 h-4 text-primary-500" />
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{group.title}</span>
        </div>
        <div className="p-3 space-y-2">
          {group.items.map((item) => (
            <FeatureToggle key={item.key} item={item} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            {shop ? 'Edit Shop' : 'Create New Shop'}
          </h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400">
            <FiX className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Basic Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Shop Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => handleChange(null, 'name', e.target.value)}
                  className="input-field"
                  required
                  placeholder="My Shop"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Business Type *</label>
                <select
                  value={form.businessType}
                  onChange={(e) => handleChange(null, 'businessType', e.target.value)}
                  className="input-field"
                  required
                >
                  {businessTypes.map(bt => (
                    <option key={bt.value} value={bt.value}>{bt.label}</option>
                  ))}
                </select>
              </div>
              {form.businessType === 'custom' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Custom Type *</label>
                  <input
                    type="text"
                    value={form.customBusinessType}
                    onChange={(e) => handleChange(null, 'customBusinessType', e.target.value)}
                    className="input-field"
                    required
                    placeholder="e.g. Restaurant"
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">GSTIN</label>
                <input
                  type="text"
                  value={form.gstin}
                  onChange={(e) => handleChange(null, 'gstin', e.target.value)}
                  className="input-field"
                  placeholder="22AAAAA0000A1Z5"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">PAN</label>
                <input
                  type="text"
                  value={form.pan}
                  onChange={(e) => handleChange(null, 'pan', e.target.value)}
                  className="input-field"
                  placeholder="AAAAA0000A"
                />
              </div>
            </div>
          </div>

          {/* Plan & Admin Info */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Subscription Plan & Admin</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Subscription Plan {!shop && '*'}
                </label>
                {plansLoading ? (
                  <div className="input-field bg-gray-100 dark:bg-gray-700 animate-pulse" />
                ) : (
                  <select
                    value={form.subscriptionPlan}
                    onChange={(e) => handleChange(null, 'subscriptionPlan', e.target.value)}
                    className="input-field"
                    required={!shop}
                  >
                    <option value="">Select a plan</option>
                    {plans.map(plan => (
                      <option key={plan._id} value={plan._id}>
                        {plan.name} - ₹{plan.monthlyPrice}/month
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Shop Admin Email {!shop && '*'}
                </label>
                <input
                  type="email"
                  value={form.adminEmail}
                  onChange={(e) => handleChange(null, 'adminEmail', e.target.value)}
                  className="input-field"
                  required={!shop}
                  placeholder="admin@shop.com"
                />
              </div>
              {!shop && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Admin Password
                  </label>
                  <input
                    type="text"
                    value={form.adminPassword}
                    onChange={(e) => handleChange(null, 'adminPassword', e.target.value)}
                    className="input-field"
                    placeholder="Leave blank for default: Admin@123"
                  />
                  <p className="mt-1 text-xs text-gray-400">
                    Default password is <strong>Admin@123</strong>
                  </p>
                </div>
              )}
            </div>

            {/* Trial Period Toggle */}
            {!shop && (
              <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <FiClock className="w-4 h-4 text-primary-500" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Trial Period</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.isTrial}
                      onChange={(e) => handleChange(null, 'isTrial', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
                  </label>
                </div>
                {form.isTrial && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Trial Duration (days)
                    </label>
                    <input
                      type="number"
                      value={form.trialDays}
                      onChange={(e) => handleChange(null, 'trialDays', parseInt(e.target.value) || 14)}
                      className="input-field w-32"
                      min={1}
                      max={365}
                    />
                    <p className="mt-1 text-xs text-gray-400">
                      Shop will start in trial mode. After {form.trialDays} days, subscription will be required.
                    </p>
                  </div>
                )}
                {!form.isTrial && (
                  <p className="text-xs text-gray-400">
                    Shop will start with immediate subscription billing. Enable trial for a free evaluation period.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Features Configuration */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Feature Configuration
              </h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const allOn = {};
                    Object.keys(features).forEach(k => { allOn[k] = true; });
                    setFeatures(allOn);
                  }}
                  className="text-xs px-2 py-1 rounded bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 hover:bg-primary-100 dark:hover:bg-primary-900/50"
                >
                  Enable All
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const allOff = {};
                    Object.keys(features).forEach(k => { allOff[k] = false; });
                    // Keep essentials on
                    allOff.pos = true;
                    allOff.inventory = true;
                    allOff.gstModule = true;
                    allOff.emailNotifications = true;
                    allOff.lowStockAlerts = true;
                    allOff.expiryAlerts = true;
                    setFeatures(allOff);
                  }}
                  className="text-xs px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  Reset to Defaults
                </button>
              </div>
            </div>
            <p className="text-xs text-gray-400">
              Toggle features on/off for this shop. Only enabled features will appear in the shop dashboard.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {featureGroups.map((group) => (
                <FeatureGroup key={group.title} group={group} />
              ))}
            </div>
          </div>

          {/* Contact */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Contact Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email *</label>
                <input
                  type="email"
                  value={form.contact.email}
                  onChange={(e) => handleChange('contact', 'email', e.target.value)}
                  className="input-field"
                  required
                  placeholder="shop@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone *</label>
                <input
                  type="text"
                  value={form.contact.phone}
                  onChange={(e) => handleChange('contact', 'phone', e.target.value)}
                  className="input-field"
                  required
                  placeholder="+919999999999"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Website</label>
                <input
                  type="url"
                  value={form.contact.website}
                  onChange={(e) => handleChange('contact', 'website', e.target.value)}
                  className="input-field"
                  placeholder="https://example.com"
                />
              </div>
            </div>
          </div>

          {/* Address */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Address</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Address Line 1 *</label>
                <input
                  type="text"
                  value={form.address.line1}
                  onChange={(e) => handleChange('address', 'line1', e.target.value)}
                  className="input-field"
                  required
                  placeholder="Shop no, building"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Address Line 2</label>
                <input
                  type="text"
                  value={form.address.line2}
                  onChange={(e) => handleChange('address', 'line2', e.target.value)}
                  className="input-field"
                  placeholder="Street, area"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">City *</label>
                <input
                  type="text"
                  value={form.address.city}
                  onChange={(e) => handleChange('address', 'city', e.target.value)}
                  className="input-field"
                  required
                  placeholder="Mumbai"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">State *</label>
                <input
                  type="text"
                  value={form.address.state}
                  onChange={(e) => handleChange('address', 'state', e.target.value)}
                  className="input-field"
                  required
                  placeholder="Maharashtra"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Pincode *</label>
                <input
                  type="text"
                  value={form.address.pincode}
                  onChange={(e) => handleChange('address', 'pincode', e.target.value)}
                  className="input-field"
                  required
                  placeholder="400001"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Country</label>
                <input
                  type="text"
                  value={form.address.country}
                  onChange={(e) => handleChange('address', 'country', e.target.value)}
                  className="input-field"
                  placeholder="India"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-4 border-t dark:border-gray-700">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? 'Saving...' : shop ? 'Update Shop' : 'Create Shop'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Shop Detail Modal ───
function ShopDetailModal({ shop, onClose, onPasswordReset }) {
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  const handleSendResetLink = async () => {
    setResetLoading(true);
    try {
      await apiService.sendAdminPasswordResetLink(shop._id);
      toast.success('Password reset link sent to shop admin email');
      setShowResetConfirm(false);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send reset link');
    } finally {
      setResetLoading(false);
    }
  };

  if (!shop) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content max-w-lg" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">{shop.name}</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400">
            <FiX className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-5">
          <div className="flex items-center gap-3">
            <FiShoppingBag className="w-5 h-5 text-primary-500" />
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Business Type</p>
              <p className="font-medium text-gray-900 dark:text-white">
                {shop.businessType?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <FiMail className="w-5 h-5 text-primary-500" />
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Email</p>
              <p className="font-medium text-gray-900 dark:text-white">{shop.contact?.email || '-'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <FiPhone className="w-5 h-5 text-primary-500" />
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Phone</p>
              <p className="font-medium text-gray-900 dark:text-white">{shop.contact?.phone || '-'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <FiMapPin className="w-5 h-5 text-primary-500" />
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Address</p>
              <p className="font-medium text-gray-900 dark:text-white">
                {[shop.address?.line1, shop.address?.city, shop.address?.state, shop.address?.pincode].filter(Boolean).join(', ') || '-'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <FiCalendar className="w-5 h-5 text-primary-500" />
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Created</p>
              <p className="font-medium text-gray-900 dark:text-white">
                {shop.createdAt ? new Date(shop.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' }) : '-'}
              </p>
            </div>
          </div>
          {shop.gstin && (
            <div className="flex items-center gap-3">
              <FiDollarSign className="w-5 h-5 text-primary-500" />
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">GSTIN</p>
                <p className="font-medium text-gray-900 dark:text-white">{shop.gstin}</p>
              </div>
            </div>
          )}
          {/* Features Summary */}
          {shop.features && (
            <div className="pt-4 border-t dark:border-gray-700">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">Enabled Features</p>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(shop.features).map(([key, value]) => {
                  if (!value) return null;
                  const featureLabels = {
                    pos: 'POS Terminal', inventory: 'Inventory', crm: 'CRM',
                    suppliers: 'Suppliers', purchases: 'Purchases', expenses: 'Expenses',
                    employees: 'Employees', multiBranch: 'Multi-Branch', loyalty: 'Loyalty',
                    ecommerce: 'E-Commerce', customerPortal: 'Customer Portal',
                    barcodeScanner: 'Barcode Scanner', thermalPrinter: 'Thermal Printer',
                    whatsappNotifications: 'WhatsApp', emailNotifications: 'Email Notif.',
                    lowStockAlerts: 'Low Stock Alert', expiryAlerts: 'Expiry Alerts',
                    gstModule: 'GST Module', referralSystem: 'Referral System',
                    aiForecasting: 'AI Forecasting', customerSupport: 'Customer Support',
                  };
                  return (
                    <span key={key} className="text-xs px-2 py-1 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 rounded-full">
                      {featureLabels[key] || key}
                    </span>
                  );
                })}
                {/* Settings-based features */}
                {shop.settings?.offlinePos && <span className="text-xs px-2 py-1 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 rounded-full">Offline POS</span>}
                {shop.settings?.autoBackup && <span className="text-xs px-2 py-1 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 rounded-full">Auto Backup</span>}
                {shop.settings?.multiLanguage && <span className="text-xs px-2 py-1 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 rounded-full">Multi-Language</span>}
              </div>
            </div>
          )}

          <div className="pt-4 border-t dark:border-gray-700 flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Status</p>
              <StatusBadge status={shop.status} />
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500 dark:text-gray-400">Subscription</p>
              <StatusBadge status={shop.subscription?.status} />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-6 border-t dark:border-gray-700 flex gap-3">
          <button
            onClick={() => setShowResetConfirm(true)}
            className="btn-secondary flex-1 flex items-center justify-center gap-2"
          >
            <FiKey className="w-4 h-4" />
            Reset Admin Password
          </button>
          <button
            onClick={onClose}
            className="btn-secondary px-4"
          >
            Close
          </button>
        </div>

        {/* Reset Password Confirmation Modal */}
        {showResetConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowResetConfirm(false)}>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-sm" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Reset Shop Admin Password?</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
                A password reset link will be sent to the shop admin email address.
              </p>
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded p-3 mb-4">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>Email:</strong> {shop.contact?.email}
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowResetConfirm(false)}
                  className="btn-secondary flex-1"
                  disabled={resetLoading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendResetLink}
                  disabled={resetLoading}
                  className="btn-primary flex-1"
                >
                  {resetLoading ? 'Sending...' : 'Send Reset Link'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Shops Management Page ───
export default function ShopsPage() {
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedShop, setSelectedShop] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const loadShops = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 15, search: search || undefined };
      if (statusFilter) params.status = statusFilter;
      const res = await apiService.getShops(params);
      const data = res.data?.data || [];
      const pagination = res.data?.pagination || {};
      setShops(Array.isArray(data) ? data : []);
      setTotalPages(pagination.pages || 1);
      setTotal(pagination.total || 0);
    } catch (err) {
      toast.error('Failed to load shops');
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => { loadShops(); }, [loadShops]);

  // Debounce search
  const [searchInput, setSearchInput] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const handleAction = async (action, shopId) => {
    try {
      if (action === 'activate') {
        await apiService.activateShop(shopId);
        toast.success('Shop activated');
      } else if (action === 'suspend') {
        await apiService.suspendShop(shopId);
        toast.success('Shop suspended');
      } else if (action === 'delete') {
        if (!window.confirm('Are you sure you want to delete this shop?')) return;
        await apiService.deleteShop(shopId);
        toast.success('Shop deleted');
      }
      loadShops();
    } catch (err) {
      toast.error(err.response?.data?.message || `Failed to ${action} shop`);
    }
  };

  const handleView = (shop) => {
    setSelectedShop(shop);
    setShowDetailModal(true);
  };

  const handleEdit = (shop) => {
    setSelectedShop(shop);
    setShowCreateModal(true);
  };

  const handleResetPassword = (shop) => {
    setSelectedShop(shop);
    setShowDetailModal(true);
  };

  const handleSendPaymentReminder = async (shop) => {
    try {
      await apiService.sendSubscriptionReminder(shop._id);
      toast.success(`Payment reminder sent to ${shop.name} admin`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send payment reminder');
    }
  };

  // Render storage usage with progress bar
  const renderStorageCell = (shop) => {
    const usedMB = shop.usage?.currentStorage || 0;
    const maxGB = shop.limits?.maxStorage || 5;
    const maxMB = maxGB * 1024;
    const percent = maxMB > 0 ? Math.min((usedMB / maxMB) * 100, 100) : 0;
    const isOverLimit = usedMB >= maxMB;

    // Format: show in GB if over 1GB, else show in MB
    const usedFormatted = usedMB >= 1024
      ? `${(usedMB / 1024).toFixed(1)} GB`
      : `${Math.round(usedMB)} MB`;

    const barColor = isOverLimit
      ? 'bg-danger-500'
      : percent > 80
        ? 'bg-warning-500'
        : 'bg-success-500';

    return (
      <div className="min-w-[120px]">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className={`font-medium ${isOverLimit ? 'text-danger-600 dark:text-danger-400' : 'text-gray-700 dark:text-gray-300'}`}>
            {usedFormatted}
          </span>
          <span className="text-gray-400">{maxGB} GB</span>
        </div>
        <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${barColor}`}
            style={{ width: `${Math.min(percent, 100)}%` }}
          />
        </div>
        {isOverLimit && (
          <p className="text-[10px] text-danger-600 dark:text-danger-400 font-medium mt-0.5 flex items-center gap-1">
            <FiAlertTriangle className="w-3 h-3" />
            Limit reached — shop suspended
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="page-container">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Shops Management</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage all shops on the platform — {total} total
          </p>
        </div>
        <button
          onClick={() => { setSelectedShop(null); setShowCreateModal(true); }}
          className="btn-primary flex items-center gap-2"
        >
          <FiPlus className="w-4 h-4" />
          New Shop
        </button>
      </div>

      {/* Filters */}
      <div className="card mb-6">
        <div className="card-body">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search shops by name, email, phone, or GSTIN..."
                className="input-field pl-9"
              />
            </div>
            <div className="w-full sm:w-48">
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                className="input-field"
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
                <option value="disabled">Disabled</option>
              </select>
            </div>
            <button
              onClick={loadShops}
              disabled={loading}
              className="btn-secondary flex items-center gap-2"
            >
              <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Shops Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full" style={{ minWidth: '1200px' }}>
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-900">
                <th className="table-header">Shop Name</th>
                <th className="table-header">Business Type</th>
                <th className="table-header">Email</th>
                <th className="table-header">Phone</th>
                <th className="table-header">City</th>
                <th className="table-header">Storage</th>
                <th className="table-header">Status</th>
                <th className="table-header">Subscription</th>
                <th className="table-header">Start Date</th>
                <th className="table-header">End Date</th>
                <th className="table-header text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-gray-700">
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 11 }).map((_, j) => (
                      <td key={j} className="table-cell"><div className="h-5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : shops.length === 0 ? (
                <tr>
                  <td colSpan={11} className="text-center py-12">
                    <FiShoppingBag className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                    <p className="text-gray-400 dark:text-gray-500">No shops found</p>
                    <button
                      onClick={() => { setSelectedShop(null); setShowCreateModal(true); }}
                      className="btn-primary mt-4 inline-flex items-center gap-2"
                    >
                      <FiPlus className="w-4 h-4" />
                      Create First Shop
                    </button>
                  </td>
                </tr>
              ) : (
                shops.map((shop) => {
                  const subStart = shop.subscription?.currentPeriodStart ? new Date(shop.subscription.currentPeriodStart) : null;
                  const subEnd = shop.subscription?.currentPeriodEnd ? new Date(shop.subscription.currentPeriodEnd) : null;
                  const trialEnd = shop.subscription?.trialEndsAt ? new Date(shop.subscription.trialEndsAt) : null;
                  return (
                  <tr key={shop._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="table-cell">
                      <button
                        onClick={() => handleView(shop)}
                        className="font-medium text-primary-600 dark:text-primary-400 hover:underline text-left"
                      >
                        {shop.name}
                      </button>
                    </td>
                    <td className="table-cell">
                      <span className="text-xs text-gray-500">
                        {shop.businessType?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </span>
                    </td>
                    <td className="table-cell">{shop.contact?.email || '-'}</td>
                    <td className="table-cell">{shop.contact?.phone || '-'}</td>
                    <td className="table-cell">{shop.address?.city || '-'}</td>
                    <td className="table-cell">
                      {renderStorageCell(shop)}
                    </td>
                    <td className="table-cell"><StatusBadge status={shop.status} /></td>
                    <td className="table-cell">
                      <span className={`badge ${shop.subscription?.status === 'active' ? 'badge-success' : 'badge-warning'}`}>
                        {shop.subscription?.status || 'trial'}
                      </span>
                    </td>
                    <td className="table-cell text-xs">
                      {subStart ? subStart.toLocaleDateString('en-IN') : (shop.createdAt ? new Date(shop.createdAt).toLocaleDateString('en-IN') : '-')}
                    </td>
                    <td className="table-cell text-xs">
                      {shop.subscription?.status === 'trial'
                        ? (trialEnd ? trialEnd.toLocaleDateString('en-IN') : '-')
                        : (subEnd ? subEnd.toLocaleDateString('en-IN') : '-')
                      }
                    </td>
                    <td className="table-cell text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleView(shop)}
                          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400"
                          title="View Details"
                        >
                          <FiEye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEdit(shop)}
                          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-blue-500"
                          title="Edit Shop"
                        >
                          <FiEdit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleResetPassword(shop)}
                          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-primary-500"
                          title="Reset Admin Password"
                        >
                          <FiKey className="w-4 h-4" />
                        </button>
                        {shop.status === 'active' ? (
                          <button
                            onClick={() => handleAction('suspend', shop._id)}
                            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-warning-500"
                            title="Suspend"
                          >
                            <FiToggleRight className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleAction('activate', shop._id)}
                            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-success-500"
                            title="Activate"
                          >
                            <FiToggleLeft className="w-4 h-4" />
                          </button>
                        )}
                        {/* Payment action for shops on trial/expired */}
                        {(shop.subscription?.status === 'trial' || shop.subscription?.status === 'expired') && (
                          <button
                            onClick={() => handleSendPaymentReminder(shop)}
                            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-warning-600"
                            title="Send Payment Link"
                          >
                            <FiSend className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleAction('delete', shop._id)}
                          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-danger-400"
                          title="Delete"
                        >
                          <FiTrash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Page {page} of {totalPages} ({total} total shops)
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn-secondary p-2 disabled:opacity-50"
              >
                <FiChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                const pageNum = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
                if (pageNum > totalPages) return null;
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={`px-3 py-1.5 text-sm rounded-lg ${
                      pageNum === page
                        ? 'bg-primary-600 text-white'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="btn-secondary p-2 disabled:opacity-50"
              >
                <FiChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showCreateModal && (
        <ShopModal
          shop={selectedShop}
          onClose={() => { setShowCreateModal(false); setSelectedShop(null); }}
          onSave={() => { setShowCreateModal(false); setSelectedShop(null); loadShops(); }}
        />
      )}
      {showDetailModal && (
        <ShopDetailModal
          shop={selectedShop}
          onClose={() => { setShowDetailModal(false); setSelectedShop(null); }}
        />
      )}
    </div>
  );
}
