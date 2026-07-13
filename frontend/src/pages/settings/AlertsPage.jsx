import React, { useState, useEffect, useCallback } from 'react';
import {
  FiBell, FiToggleLeft, FiRefreshCw, FiAlertCircle,
  FiCheckCircle, FiMail, FiSmartphone, FiMonitor,
  FiMessageSquare, FiSave, FiClock, FiDollarSign,
  FiPackage, FiShoppingBag, FiShield, FiUsers,
  FiBarChart2, FiFileText, FiCreditCard, FiRotateCcw,
} from 'react-icons/fi';
import { apiService } from '../../services/api';

const ALERT_GROUPS = [
  {
    id: 'stock',
    label: 'Stock & Inventory',
    icon: FiPackage,
    types: [
      { type: 'low_stock', label: 'Low Stock', description: 'Notify when product stock falls below threshold', icon: FiAlertCircle },
      { type: 'out_of_stock', label: 'Out of Stock', description: 'Alert when products are completely out of stock', icon: FiPackage },
      { type: 'expiry', label: 'Expiry Warning', description: 'Warn about products nearing expiration date', icon: FiClock },
    ],
  },
  {
    id: 'orders',
    label: 'Orders & Payments',
    icon: FiShoppingBag,
    types: [
      { type: 'pending_payment', label: 'Pending Payments', description: 'Remind about orders with pending payments', icon: FiDollarSign },
      { type: 'large_order', label: 'Large Orders', description: 'Get notified on orders above threshold amount', icon: FiShoppingBag },
      { type: 'failed_payment', label: 'Failed Payments', description: 'Alert on payment failures during checkout', icon: FiAlertCircle },
      { type: 'payment_reconciliation', label: 'Payment Reconciliation', description: 'Notify when daily payment reconciliation is due', icon: FiCreditCard },
    ],
  },
  {
    id: 'security',
    label: 'Security',
    icon: FiShield,
    types: [
      { type: 'suspicious_login', label: 'Suspicious Login', description: 'Alert on login from unusual locations or devices', icon: FiShield },
    ],
  },
  {
    id: 'customers',
    label: 'Customers',
    icon: FiUsers,
    types: [
      { type: 'missing_customer_id', label: 'Missing Customer ID', description: 'Warn when POS orders are created without customer ID', icon: FiUsers },
      { type: 'new_customer', label: 'New Customer Registration', description: 'Notify when a new customer registers', icon: FiUsers },
    ],
  },
  {
    id: 'reports',
    label: 'Reports & Summaries',
    icon: FiBarChart2,
    types: [
      { type: 'daily_sales_report', label: 'Daily Sales Report', description: 'Receive daily sales summary via email/dashboard', icon: FiBarChart2 },
      { type: 'weekly_report', label: 'Weekly Report', description: 'Receive weekly performance report', icon: FiFileText },
      { type: 'monthly_report', label: 'Monthly Report', description: 'Receive monthly comprehensive report', icon: FiFileText },
    ],
  },
  {
    id: 'compliance',
    label: 'Compliance & Billing',
    icon: FiFileText,
    types: [
      { type: 'gst_filing_due', label: 'GST Filing Due', description: 'Remind when GST filing deadline approaches', icon: FiFileText },
      { type: 'subscription_renewal', label: 'Subscription Renewal', description: 'Notify before subscription plan renewal', icon: FiRotateCcw },
    ],
  },
];

const CHANNEL_ICONS = {
  email: FiMail,
  dashboard: FiMonitor,
  whatsapp: FiMessageSquare,
  sms: FiSmartphone,
};

const CHANNEL_LABELS = {
  email: 'Email',
  dashboard: 'Dashboard',
  whatsapp: 'WhatsApp',
  sms: 'SMS',
};

const CHANNEL_COLORS = {
  email: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
  dashboard: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800',
  whatsapp: 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
  sms: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800',
};

function ToggleSwitch({ enabled, onChange, size = 'md' }) {
  const sizes = {
    sm: 'h-5 w-9',
    md: 'h-6 w-11',
  };
  const dots = {
    sm: 'h-3.5 w-3.5',
    md: 'h-4 w-4',
  };
  const tx = {
    sm: 'translate-x-4',
    md: 'translate-x-5',
  };

  return (
    <button
      type="button"
      onClick={() => onChange(!enabled)}
      className={`relative inline-flex ${sizes[size]} items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
        enabled ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'
      }`}
    >
      <span
        className={`inline-block ${dots[size]} transform rounded-full bg-white transition-transform ${
          enabled ? tx[size] : 'translate-x-1'
        }`}
      />
    </button>
  );
}

function ChannelToggle({ channel, enabled, onChange }) {
  const Icon = CHANNEL_ICONS[channel];
  return (
    <button
      onClick={() => onChange(channel, !enabled)}
      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all border ${
        enabled
          ? CHANNEL_COLORS[channel]
          : 'text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
      }`}
    >
      <Icon className="w-3.5 h-3.5" />
      {CHANNEL_LABELS[channel]}
    </button>
  );
}

function ThresholdInput({ label, value, onChange, suffix }) {
  return (
    <div className="flex items-center gap-2">
      <label className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">{label}</label>
      <div className="relative flex-1 max-w-[120px]">
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-1 focus:ring-indigo-500"
        />
        {suffix && (
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">{suffix}</span>
        )}
      </div>
    </div>
  );
}

function ScheduleField({ label, value, onChange, type = 'time' }) {
  return (
    <div className="flex items-center gap-2">
      <label className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-1 focus:ring-indigo-500"
      />
    </div>
  );
}

function AlertCard({ alertType, config, onToggle, onUpdateConfig }) {
  const [expanded, setExpanded] = useState(false);
  const data = config || { enabled: true, channels: { email: true, dashboard: true, whatsapp: false, sms: false } };
  const isEnabled = data.enabled !== false;

  return (
    <div className={`rounded-lg border transition-all ${
      isEnabled
        ? 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
        : 'border-gray-100 dark:border-gray-700/50 bg-gray-50 dark:bg-gray-800/50'
    }`}>
      <div className="flex items-center justify-between p-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
            isEnabled
              ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
          }`}>
            <alertType.icon className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h4 className={`text-sm font-medium truncate ${isEnabled ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>
                {alertType.label}
              </h4>
              <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded-full ${
                isEnabled
                  ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
              }`}>
                {isEnabled ? 'Active' : 'Disabled'}
              </span>
            </div>
            <p className={`text-xs mt-0.5 truncate ${isEnabled ? 'text-gray-500 dark:text-gray-400' : 'text-gray-400 dark:text-gray-500'}`}>
              {alertType.description}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
          <ToggleSwitch
            enabled={isEnabled}
            onChange={(v) => onToggle(alertType.type, v)}
            size="sm"
          />
          <button
            onClick={() => setExpanded(!expanded)}
            className={`p-1 rounded transition-colors ${
              expanded
                ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20'
                : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <FiAlertCircle className={`w-3.5 h-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-100 dark:border-gray-700 px-3 py-3 space-y-3">
          {/* Channels */}
          <div>
            <h5 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Notification Channels</h5>
            <div className="flex flex-wrap gap-1.5">
              {Object.keys(CHANNEL_LABELS).map((ch) => (
                <ChannelToggle
                  key={ch}
                  channel={ch}
                  enabled={data.channels?.[ch] === true}
                  onChange={(channel, val) => {
                    onUpdateConfig(alertType.type, {
                      ...data,
                      channels: { ...data.channels, [channel]: val },
                    });
                  }}
                />
              ))}
            </div>
          </div>

          {/* Thresholds */}
          {(alertType.type === 'low_stock' || alertType.type === 'large_order' || alertType.type === 'expiry' || alertType.type === 'pending_payment') && (
            <div>
              <h5 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Thresholds</h5>
              <div className="grid grid-cols-2 gap-2">
                {alertType.type === 'low_stock' && (
                  <ThresholdInput
                    label="Min Stock Level"
                    value={data.thresholds?.lowStockLevel ?? 10}
                    onChange={(v) => onUpdateConfig(alertType.type, {
                      ...data,
                      thresholds: { ...data.thresholds, lowStockLevel: v },
                    })}
                    suffix="units"
                  />
                )}
                {alertType.type === 'large_order' && (
                  <ThresholdInput
                    label="Min Amount"
                    value={data.thresholds?.largeOrderAmount ?? 50000}
                    onChange={(v) => onUpdateConfig(alertType.type, {
                      ...data,
                      thresholds: { ...data.thresholds, largeOrderAmount: v },
                    })}
                    suffix="₹"
                  />
                )}
                {alertType.type === 'expiry' && (
                  <ThresholdInput
                    label="Warning Period"
                    value={data.thresholds?.expiryDays ?? 30}
                    onChange={(v) => onUpdateConfig(alertType.type, {
                      ...data,
                      thresholds: { ...data.thresholds, expiryDays: v },
                    })}
                    suffix="days"
                  />
                )}
                {alertType.type === 'pending_payment' && (
                  <ThresholdInput
                    label="Grace Period"
                    value={data.thresholds?.pendingPaymentDays ?? 7}
                    onChange={(v) => onUpdateConfig(alertType.type, {
                      ...data,
                      thresholds: { ...data.thresholds, pendingPaymentDays: v },
                    })}
                    suffix="days"
                  />
                )}
              </div>
            </div>
          )}

          {/* Schedule */}
          {(alertType.type === 'daily_sales_report' || alertType.type === 'weekly_report' || alertType.type === 'monthly_report') && (
            <div>
              <h5 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Schedule</h5>
              <div className="flex flex-wrap gap-3">
                {alertType.type === 'daily_sales_report' && (
                  <ScheduleField
                    label="Time"
                    value={data.schedule?.dailyReportTime ?? '20:00'}
                    onChange={(v) => onUpdateConfig(alertType.type, {
                      ...data,
                      schedule: { ...data.schedule, dailyReportTime: v },
                    })}
                  />
                )}
                {alertType.type === 'weekly_report' && (
                  <>
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-gray-500 dark:text-gray-400">Day</label>
                      <select
                        value={data.schedule?.weeklyReportDay ?? 1}
                        onChange={(e) => onUpdateConfig(alertType.type, {
                          ...data,
                          schedule: { ...data.schedule, weeklyReportDay: Number(e.target.value) },
                        })}
                        className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      >
                        {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((d, i) => (
                          <option key={i} value={i}>{d}</option>
                        ))}
                      </select>
                    </div>
                    <ScheduleField
                      label="Time"
                      value={data.schedule?.weeklyReportTime ?? '09:00'}
                      onChange={(v) => onUpdateConfig(alertType.type, {
                        ...data,
                        schedule: { ...data.schedule, weeklyReportTime: v },
                      })}
                    />
                  </>
                )}
                {alertType.type === 'monthly_report' && (
                  <>
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-gray-500 dark:text-gray-400">Day</label>
                      <input
                        type="number"
                        min={1}
                        max={28}
                        value={data.schedule?.monthlyReportDay ?? 1}
                        onChange={(e) => onUpdateConfig(alertType.type, {
                          ...data,
                          schedule: { ...data.schedule, monthlyReportDay: Number(e.target.value) },
                        })}
                        className="w-14 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      />
                    </div>
                    <ScheduleField
                      label="Time"
                      value={data.schedule?.monthlyReportTime ?? '09:00'}
                      onChange={(v) => onUpdateConfig(alertType.type, {
                        ...data,
                        schedule: { ...data.schedule, monthlyReportTime: v },
                      })}
                    />
                  </>
                )}
              </div>
            </div>
          )}

          {/* Recipients */}
          <div>
            <h5 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Recipients</h5>
            <div className="flex flex-wrap gap-3">
              {[
                { key: 'shopAdmin', label: 'Shop Admin' },
                { key: 'manager', label: 'Manager' },
                { key: 'staff', label: 'Staff' },
              ].map((r) => (
                <label key={r.key} className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={data.recipients?.[r.key] === true}
                    onChange={(e) => onUpdateConfig(alertType.type, {
                      ...data,
                      recipients: { ...data.recipients, [r.key]: e.target.checked },
                    })}
                    className="w-3.5 h-3.5 rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-xs text-gray-600 dark:text-gray-300">{r.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AlertsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [alertConfigs, setAlertConfigs] = useState({});
  const [dirtyTypes, setDirtyTypes] = useState(new Set());

  const showSuccess = (msg) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const loadAlerts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiService.getAlerts();
      const data = res.data?.data || res.data || [];
      const configMap = {};
      data.forEach((alert) => {
        configMap[alert.type] = alert;
      });
      setAlertConfigs(configMap);
      setDirtyTypes(new Set());
    } catch (err) {
      setError('Failed to load alert configurations');
      console.error('Load alerts error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAlerts();
  }, [loadAlerts]);

  const handleToggle = async (type, enabled) => {
    // Optimistic update
    setAlertConfigs((prev) => ({
      ...prev,
      [type]: { ...prev[type], enabled },
    }));
    try {
      await apiService.toggleAlert(type);
      showSuccess(enabled ? 'Alert enabled' : 'Alert disabled');
    } catch (err) {
      // Revert on error
      setAlertConfigs((prev) => ({
        ...prev,
        [type]: { ...prev[type], enabled: !enabled },
      }));
      setError('Failed to toggle alert');
    }
  };

  const handleUpdateConfig = (type, config) => {
    setAlertConfigs((prev) => ({ ...prev, [type]: config }));
    setDirtyTypes((prev) => new Set(prev).add(type));
  };

  const handleSaveAll = async () => {
    if (dirtyTypes.size === 0) return;
    setSaving(true);
    setError(null);
    let saved = 0;
    let failed = 0;

    const typesToSave = Array.from(dirtyTypes);
    for (const type of typesToSave) {
      try {
        const config = alertConfigs[type];
        await apiService.updateAlertConfig(type, config);
        saved++;
      } catch (err) {
        failed++;
        console.error(`Failed to save alert ${type}:`, err);
      }
    }

    setSaving(false);
    if (failed === 0) {
      showSuccess(`Saved ${saved} alert configuration${saved > 1 ? 's' : ''}`);
      setDirtyTypes(new Set());
    } else {
      setError(`Saved ${saved}, failed ${failed} alert${failed > 1 ? 's' : ''}`);
      // Reload to get clean state
      loadAlerts();
    }
  };

  const handleReset = () => {
    loadAlerts();
  };

  const totalAlerts = ALERT_GROUPS.reduce((sum, g) => sum + g.types.length, 0);
  const enabledAlerts = Object.values(alertConfigs).filter((c) => c.enabled !== false).length;
  const hasChanges = dirtyTypes.size > 0;

  if (loading) {
    return (
      <div className="p-4 md:p-6 space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-4 w-72 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Alerts</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Configure alert rules and notification preferences
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <FiRefreshCw className="w-4 h-4" />
            Reset
          </button>
          <button
            onClick={handleSaveAll}
            disabled={!hasChanges || saving}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              hasChanges
                ? 'text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm'
                : 'text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 cursor-not-allowed'
            }`}
          >
            <FiSave className="w-4 h-4" />
            {saving ? 'Saving...' : `Save${hasChanges ? ` (${dirtyTypes.size})` : ''}`}
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center">
              <FiBell className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalAlerts}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Total Alerts</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-50 dark:bg-green-900/20 flex items-center justify-center">
              <FiCheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{enabledAlerts}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Active</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gray-50 dark:bg-gray-700 flex items-center justify-center">
              <FiToggleLeft className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalAlerts - enabledAlerts}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Disabled</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
              <FiAlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{dirtyTypes.size}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Unsaved Changes</p>
            </div>
          </div>
        </div>
      </div>

      {/* Success Banner */}
      {successMessage && (
        <div className="flex items-center gap-2 px-4 py-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-xl text-sm text-green-700 dark:text-green-400">
          <FiCheckCircle className="w-4 h-4 flex-shrink-0" />
          {successMessage}
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl text-sm text-red-700 dark:text-red-400">
          <FiAlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Unsaved Changes Banner */}
      {hasChanges && !successMessage && (
        <div className="flex items-center gap-2 px-4 py-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl text-sm text-amber-700 dark:text-amber-400">
          <FiAlertCircle className="w-4 h-4 flex-shrink-0" />
          You have {dirtyTypes.size} unsaved change{dirtyTypes.size > 1 ? 's' : ''}. Click Save to apply.
        </div>
      )}

      {/* Alert Groups */}
      <div className="space-y-6">
        {ALERT_GROUPS.map((group) => (
          <div key={group.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80">
              <div className="flex items-center gap-2">
                <group.icon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{group.label}</h3>
                <span className="text-xs text-gray-400 dark:text-gray-500">({group.types.length})</span>
              </div>
            </div>
            <div className="p-3 space-y-2">
              {group.types.map((alertType) => (
                <AlertCard
                  key={alertType.type}
                  alertType={alertType}
                  config={alertConfigs[alertType.type]}
                  onToggle={handleToggle}
                  onUpdateConfig={handleUpdateConfig}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
