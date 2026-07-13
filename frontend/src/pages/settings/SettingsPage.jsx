import React, { useState, useEffect, useCallback } from 'react';
import {
  FiSave, FiSettings, FiUsers, FiBell, FiShield,
  FiGlobe, FiToggleLeft, FiTrash2,
  FiPlus, FiRefreshCw, FiAlertCircle, FiCheckCircle,
  FiX, FiEdit2, FiMail, FiSmartphone, FiClock,
  FiDollarSign, FiPercent, FiMapPin, FiImage,
  FiPrinter
} from 'react-icons/fi';
import { apiService } from '../../services/api';

const SETTINGS_TABS = [
  { id: 'general', label: 'General', icon: FiSettings },
  { id: 'users', label: 'Users', icon: FiUsers },
  { id: 'notifications', label: 'Notifications', icon: FiBell },
  { id: 'security', label: 'Security', icon: FiShield },
  { id: 'localization', label: 'Localization', icon: FiGlobe },
];

function Toggle({ enabled, onChange, label, description }) {
  return (
    <div className="flex items-center justify-between py-3">
      <div>
        <p className="text-sm font-medium text-gray-900 dark:text-white">{label}</p>
        {description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!enabled)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
          enabled ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            enabled ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}

function InputField({ label, value, onChange, type = 'text', placeholder, helpText, icon: Icon, required }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Icon className="w-4 h-4 text-gray-400" />
          </div>
        )}
        {type === 'textarea' ? (
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className={`w-full px-3 py-2 ${Icon ? 'pl-10' : ''} border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 placeholder-gray-400`}
            rows={3}
          />
        ) : (
          <input
            type={type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className={`w-full px-3 py-2 ${Icon ? 'pl-10' : ''} border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 placeholder-gray-400`}
          />
        )}
      </div>
      {helpText && <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{helpText}</p>}
    </div>
  );
}

function UserRow({ user, onEdit, onDelete }) {
  const roleColors = {
    super_admin: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
    shop_admin: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400',
    manager: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
    staff: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400',
  };

  return (
    <div className="flex items-center justify-between py-3 px-4 hover:bg-gray-50 dark:hover:bg-gray-700/30 rounded-lg transition-colors">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
          <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
            {user.name?.charAt(0)?.toUpperCase() || 'U'}
          </span>
        </div>
        <div>
          <p className="text-sm font-medium text-gray-900 dark:text-white">{user.name}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{user.email}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${roleColors[user.role] || roleColors.staff}`}>
          {user.role?.replace('_', ' ')}
        </span>
        <button onClick={() => onEdit(user)} className="p-1.5 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
          <FiEdit2 className="w-4 h-4" />
        </button>
        {user.role !== 'super_admin' && (
          <button onClick={() => onDelete(user)} className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors">
            <FiTrash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

function UserModal({ isOpen, onClose, onSave, editingUser }) {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'staff' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editingUser) {
      setForm({ name: editingUser.name || '', email: editingUser.email || '', password: '', role: editingUser.role || 'staff' });
    } else {
      setForm({ name: '', email: '', password: '', role: 'staff' });
    }
  }, [editingUser, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(form);
      onClose();
    } catch (err) {
      console.error('Save user error:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {editingUser ? 'Edit User' : 'Add User'}
          </h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <FiX className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <InputField label="Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} required placeholder="John Doe" />
          <InputField label="Email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} type="email" required placeholder="john@example.com" icon={FiMail} />
          {!editingUser && (
            <InputField label="Password" value={form.password} onChange={(v) => setForm({ ...form, password: v })} type="password" required placeholder="Min 8 characters" icon={FiShield} />
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role</label>
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500"
            >
              <option value="staff">Staff</option>
              <option value="manager">Manager</option>
              {!editingUser && <option value="shop_admin">Shop Admin</option>}
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors">
              {saving ? 'Saving...' : editingUser ? 'Update' : 'Add User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('general');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [settings, setSettings] = useState(null);
  const [users, setUsers] = useState([]);
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  // Form state for general settings
  const [generalForm, setGeneralForm] = useState({
    shopName: '',
    gstin: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    currency: 'INR',
    timezone: 'Asia/Kolkata',
    dateFormat: 'DD/MM/YYYY',
    taxMode: 'inclusive',
    defaultDiscount: 0,
  });

  // Feature toggles state
  const [features, setFeatures] = useState({
    pos: true,
    onlineStore: true,
    loyaltyProgram: false,
    multiBranch: false,
    autoBackup: true,
    emailNotifications: true,
    smsAlerts: false,
    whatsappMessaging: false,
    gstEInvoicing: true,
    barcodePrinting: true,
    expenseTracking: true,
    employeeManagement: false,
  });

  // Alert config state
  const [alertConfig, setAlertConfig] = useState({
    lowStockThreshold: 10,
    expiryWarningDays: 30,
    dailySalesReport: true,
    weeklyReport: true,
    monthlyReport: false,
    paymentReminders: false,
    backupReminders: true,
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [settingsRes, usersRes] = await Promise.allSettled([
        apiService.getShopSettings(),
        apiService.getUsers(),
      ]);
      if (settingsRes.status === 'fulfilled') {
        const raw = settingsRes.value.data;
        const s = raw?.data || raw || {};
        setSettings(s);
        setGeneralForm({
          shopName: s.shopName || '',
          gstin: s.gstin || '',
          phone: s.phone || '',
          email: s.email || '',
          address: s.address || '',
          city: s.city || '',
          state: s.state || '',
          pincode: s.pincode || '',
          currency: s.currency || 'INR',
          timezone: s.timezone || 'Asia/Kolkata',
          dateFormat: s.dateFormat || 'DD/MM/YYYY',
          taxMode: s.taxMode || 'inclusive',
          defaultDiscount: s.defaultDiscount || 0,
        });
        if (s.features) setFeatures(s.features);
        if (s.alertConfig) setAlertConfig(s.alertConfig);
      }
      if (usersRes.status === 'fulfilled') {
        setUsers(usersRes.value.data?.users || usersRes.value?.users || []);
      }
    } catch (err) {
      setError('Failed to load settings');
      // Demo data
      setGeneralForm({
        shopName: 'Future Magnus Store',
        gstin: '27ABCDE1234F1Z5',
        phone: '+91 98765 43210',
        email: 'store@futuremagnus.com',
        address: '123, Business Hub, MG Road',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
        currency: 'INR',
        timezone: 'Asia/Kolkata',
        dateFormat: 'DD/MM/YYYY',
        taxMode: 'inclusive',
        defaultDiscount: 0,
      });
      setUsers([
        { _id: '1', name: 'Admin User', email: 'admin@futuremagnus.com', role: 'super_admin' },
        { _id: '2', name: 'Store Manager', email: 'manager@store.com', role: 'manager' },
        { _id: '3', name: 'Sales Staff 1', email: 'staff1@store.com', role: 'staff' },
        { _id: '4', name: 'Sales Staff 2', email: 'staff2@store.com', role: 'staff' },
      ]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const showSuccess = (msg) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleSaveGeneral = async () => {
    setSaving(true);
    try {
      await apiService.updateShopSettings(generalForm);
      showSuccess('Settings saved successfully');
    } catch (err) {
      setError('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveFeatures = async () => {
    setSaving(true);
    try {
      await apiService.updateShopSettings({ features });
      showSuccess('Features updated');
    } catch (err) {
      setError('Failed to update features');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAlerts = async () => {
    setSaving(true);
    try {
      await apiService.updateShopSettings({ alertConfig });
      showSuccess('Alert configuration saved');
    } catch (err) {
      setError('Failed to save alerts');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveUser = async (form) => {
    if (editingUser) {
      await apiService.updateUser(editingUser._id, form);
    } else {
      await apiService.createUser(form);
    }
    showSuccess(editingUser ? 'User updated' : 'User added');
    fetchData();
  };

  const handleDeleteUser = async (user) => {
    if (window.confirm(`Remove ${user.name} from this shop?`)) {
      try {
        await apiService.deleteUser(user._id);
        showSuccess('User removed');
        fetchData();
      } catch (err) {
        setError('Failed to remove user');
      }
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="p-4 md:p-6 space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-10 w-96 bg-gray-200 dark:bg-gray-700 rounded-lg" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-xl" />
            <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  const renderGeneralTab = () => (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Shop Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InputField label="Shop Name" value={generalForm.shopName} onChange={(v) => setGeneralForm({ ...generalForm, shopName: v })} required icon={FiSettings} />
          <InputField label="GSTIN" value={generalForm.gstin} onChange={(v) => setGeneralForm({ ...generalForm, gstin: v })} placeholder="27ABCDE1234F1Z5" icon={FiShield} />
          <InputField label="Phone" value={generalForm.phone} onChange={(v) => setGeneralForm({ ...generalForm, phone: v })} type="tel" icon={FiSmartphone} />
          <InputField label="Email" value={generalForm.email} onChange={(v) => setGeneralForm({ ...generalForm, email: v })} type="email" icon={FiMail} />
          <div className="md:col-span-2">
            <InputField label="Address" value={generalForm.address} onChange={(v) => setGeneralForm({ ...generalForm, address: v })} type="textarea" icon={FiMapPin} />
          </div>
          <InputField label="City" value={generalForm.city} onChange={(v) => setGeneralForm({ ...generalForm, city: v })} />
          <InputField label="State" value={generalForm.state} onChange={(v) => setGeneralForm({ ...generalForm, state: v })} />
          <InputField label="Pincode" value={generalForm.pincode} onChange={(v) => setGeneralForm({ ...generalForm, pincode: v })} placeholder="400001" />
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Regional Settings</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Currency</label>
            <select
              value={generalForm.currency}
              onChange={(e) => setGeneralForm({ ...generalForm, currency: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
            >
              <option value="INR">INR (₹)</option>
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Timezone</label>
            <select
              value={generalForm.timezone}
              onChange={(e) => setGeneralForm({ ...generalForm, timezone: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
            >
              <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
              <option value="UTC">UTC</option>
              <option value="Asia/Dubai">Asia/Dubai (GST)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date Format</label>
            <select
              value={generalForm.dateFormat}
              onChange={(e) => setGeneralForm({ ...generalForm, dateFormat: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
            >
              <option value="DD/MM/YYYY">DD/MM/YYYY</option>
              <option value="MM/DD/YYYY">MM/DD/YYYY</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Tax & Pricing</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tax Mode</label>
            <select
              value={generalForm.taxMode}
              onChange={(e) => setGeneralForm({ ...generalForm, taxMode: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
            >
              <option value="inclusive">Tax Inclusive</option>
              <option value="exclusive">Tax Exclusive</option>
            </select>
          </div>
          <InputField
            label="Default Discount (%)"
            value={generalForm.defaultDiscount}
            onChange={(v) => setGeneralForm({ ...generalForm, defaultDiscount: v })}
            type="number"
            icon={FiPercent}
          />
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSaveGeneral}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          <FiSave className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );

  const renderUsersTab = () => (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Team Members</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">{users.length} user{users.length !== 1 ? 's' : ''}</p>
          </div>
          <button
            onClick={() => { setEditingUser(null); setUserModalOpen(true); }}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <FiPlus className="w-4 h-4" />
            Add User
          </button>
        </div>
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {users.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              <FiUsers className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p>No users yet. Add your first team member.</p>
            </div>
          ) : (
            users.map((user) => (
              <UserRow key={user._id} user={user} onEdit={(u) => { setEditingUser(u); setUserModalOpen(true); }} onDelete={handleDeleteUser} />
            ))
          )}
        </div>
      </div>

      <UserModal
        isOpen={userModalOpen}
        onClose={() => setUserModalOpen(false)}
        onSave={handleSaveUser}
        editingUser={editingUser}
      />
    </div>
  );

  const renderNotificationsTab = () => (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Alert Configuration</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <InputField label="Low Stock Threshold" value={alertConfig.lowStockThreshold} onChange={(v) => setAlertConfig({ ...alertConfig, lowStockThreshold: Number(v) })} type="number" icon={FiAlertCircle} helpText="Notify when stock falls below this level" />
          <InputField label="Expiry Warning (Days)" value={alertConfig.expiryWarningDays} onChange={(v) => setAlertConfig({ ...alertConfig, expiryWarningDays: Number(v) })} type="number" icon={FiClock} helpText="Warn before product expiry" />
        </div>

        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Report Schedules</h4>
          <Toggle label="Daily Sales Report" description="Receive daily sales summary via email" enabled={alertConfig.dailySalesReport} onChange={(v) => setAlertConfig({ ...alertConfig, dailySalesReport: v })} />
          <Toggle label="Weekly Report" description="Weekly performance report" enabled={alertConfig.weeklyReport} onChange={(v) => setAlertConfig({ ...alertConfig, weeklyReport: v })} />
          <Toggle label="Monthly Report" description="Monthly comprehensive report" enabled={alertConfig.monthlyReport} onChange={(v) => setAlertConfig({ ...alertConfig, monthlyReport: v })} />
        </div>

        <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-2">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Reminders</h4>
          <Toggle label="Payment Reminders" description="Remind customers about pending payments" enabled={alertConfig.paymentReminders} onChange={(v) => setAlertConfig({ ...alertConfig, paymentReminders: v })} />
          <Toggle label="Backup Reminders" description="Remind when backup is due" enabled={alertConfig.backupReminders} onChange={(v) => setAlertConfig({ ...alertConfig, backupReminders: v })} />
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSaveAlerts}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          <FiSave className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save Alert Config'}
        </button>
      </div>
    </div>
  );

  const renderSecurityTab = () => (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Security Settings</h3>
        <div className="space-y-4">
          <Toggle label="Two-Factor Authentication" description="Require OTP for login" enabled={settings?.twoFactor || false} onChange={(v) => {}} />
          <Toggle label="Session Timeout" description="Auto-logout after 30 minutes of inactivity" enabled={true} onChange={() => {}} />
          <Toggle label="Login Notifications" description="Get notified on new login devices" enabled={true} onChange={() => {}} />
          <Toggle label="IP Whitelisting" description="Restrict access to specific IP addresses" enabled={false} onChange={() => {}} />
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">API Keys</h3>
        <div className="space-y-3">
          {[
            { name: 'Production API Key', key: 'fm_sk_prod_••••••••••', lastUsed: '2 hours ago' },
            { name: 'Test API Key', key: 'fm_sk_test_••••••••••', lastUsed: '5 days ago' },
          ].map((api, i) => (
            <div key={i} className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{api.name}</p>
                <p className="text-xs text-gray-500">{api.key}</p>
                <p className="text-xs text-gray-400">Last used: {api.lastUsed}</p>
              </div>
              <button className="p-2 text-gray-400 hover:text-red-600 transition-colors">
                <FiTrash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          <button className="flex items-center gap-2 text-sm font-medium text-indigo-600 dark:text-indigo-400">
            <FiPlus className="w-4 h-4" />
            Generate New Key
          </button>
        </div>
      </div>
    </div>
  );

  const renderLocalizationTab = () => (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Language & Region</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InputField label="Store Language" value="English (EN)" onChange={() => {}} helpText="Display language for the POS and dashboard" />
          <InputField label="Invoice Language" value="English (EN)" onChange={() => {}} helpText="Language used on printed invoices and receipts" />
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Invoice & Receipt</h3>
        <div className="space-y-4">
          <Toggle label="Show GSTIN on Receipt" description="Display GST registration number" enabled={true} onChange={() => {}} />
          <Toggle label="Show Discount Details" description="Itemize discounts on receipts" enabled={true} onChange={() => {}} />
          <Toggle label="Digital Signature" description="Add QR-based digital signature to invoices" enabled={settings?.gstEInvoicing || true} onChange={() => {}} />
        </div>
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Receipt Footer Message</label>
          <input
            type="text"
            defaultValue="Thank you for your visit!"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
            placeholder="Thank you for shopping with us!"
          />
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Configure your shop, team, and preferences
          </p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <FiRefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Success Banner */}
      {successMessage && (
        <div className="flex items-center gap-2 px-4 py-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-xl text-sm text-green-700 dark:text-green-400 animate-fade-in">
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

      {/* Settings Tabs */}
      <div className="flex flex-wrap gap-2">
        {SETTINGS_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-all ${
              activeTab === tab.id
                ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'general' && renderGeneralTab()}
      {activeTab === 'users' && renderUsersTab()}
      {activeTab === 'notifications' && renderNotificationsTab()}
      {activeTab === 'security' && renderSecurityTab()}
      {activeTab === 'localization' && renderLocalizationTab()}
    </div>
  );
}
