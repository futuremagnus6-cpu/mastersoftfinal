import React, { useState, useEffect, useCallback } from 'react';
import {
  FiShield, FiGlobe, FiMail, FiClock, FiDollarSign,
  FiRefreshCw, FiSave, FiServer, FiDatabase, FiLock,
  FiEye, FiEyeOff, FiCopy, FiCheck, FiSend, FiMessageSquare,
  FiUsers, FiAlertCircle, FiImage, FiAlertTriangle,
} from 'react-icons/fi';
import { apiService } from '../../services/api';
import toast from 'react-hot-toast';

// ─── Setting Section ───
function SettingsSection({ icon: Icon, title, description, children }) {
  return (
    <div className="card mb-6">
      <div className="card-header">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-xl flex items-center justify-center">
            <Icon className="w-5 h-5 text-primary-600" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
          </div>
        </div>
      </div>
      <div className="card-body space-y-5">
        {children}
      </div>
    </div>
  );
}

// ─── Form Field ───
function FormField({ label, description, error, children }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4">
      <div className="flex-1">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
        {description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>}
      </div>
      <div className="sm:w-72">
        {children}
        {error && (
          <p className="mt-1.5 flex items-start gap-1.5 text-xs text-danger-600 dark:text-danger-400">
            <FiAlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </p>
        )}
      </div>
    </div>
  );
}

// ─── API Key Display ───
function ApiKeyDisplay({ label, value, onRegenerate }) {
  const [show, setShow] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div>
      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{label}</p>
      <div className="flex items-center gap-2">
        <div className="flex-1 relative">
          <input
            type={show ? 'text' : 'password'}
            value={value}
            readOnly
            className="input-field pr-20 font-mono text-xs"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            <button onClick={() => setShow(!show)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400">
              {show ? <FiEyeOff className="w-3.5 h-3.5" /> : <FiEye className="w-3.5 h-3.5" />}
            </button>
            <button onClick={handleCopy} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400">
              {copied ? <FiCheck className="w-3.5 h-3.5 text-success-500" /> : <FiCopy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
        <button onClick={onRegenerate} className="btn-secondary text-sm whitespace-nowrap">
          Regenerate
        </button>
      </div>
    </div>
  );
}

// ─── Main Settings Page ───
export default function SettingsPage() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showMaintenanceConfirm, setShowMaintenanceConfirm] = useState(false);
  const [maintenancePendingAction, setMaintenancePendingAction] = useState(null); // 'enable' or 'disable'
  const [fieldErrors, setFieldErrors] = useState({});
  const [announcementSubject, setAnnouncementSubject] = useState('');
  const [announcementMessage, setAnnouncementMessage] = useState('');
  const [announcementType, setAnnouncementType] = useState('general');
  const [sendingAnnouncement, setSendingAnnouncement] = useState(false);
  const [announcementResult, setAnnouncementResult] = useState(null);
  const [settings, setSettings] = useState({
    companyBrandName: '',
    supportEmail: 'support@futuremagnus.com',
    supportPhone: '+91-9999999999',
    logo: '',
    defaultCurrency: 'INR',
    timezone: 'Asia/Kolkata',
    dateFormat: 'DD/MM/YYYY',
    maintenanceMode: false,
    allowRegistration: true,
    defaultTrialDays: 14,
    sessionTimeout: 60,
    passwordMinLength: 8,
    twoFactorRequired: false,
    backupEnabled: true,
    billingEnabled: true,
    backupTime: '02:00',
    retentionDays: 30,
    rateLimitPerMinute: 60,
    webhookRetryCount: 3,
    apiKey: 'mag_' + Array.from({ length: 32 }, () => Math.random().toString(36)[2]).join(''),
    webhookSecret: 'whsec_' + Array.from({ length: 24 }, () => Math.random().toString(36)[2]).join(''),
  });

  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiService.getPlatformConfig();
      const remote = res.data?.data || {};
      if (remote && (remote.companyBrandName || remote.platformName)) {
        setSettings({
          companyBrandName: remote.companyBrandName || remote.platformName || 'Future Magnus Business OS',
          supportEmail: remote.supportEmail || 'support@futuremagnus.com',
          supportPhone: remote.supportPhone || '+91-9999999999',
          logo: remote.logo || '',
          defaultCurrency: remote.defaultCurrency || 'INR',
          timezone: remote.timezone || 'Asia/Kolkata',
          dateFormat: remote.dateFormat || 'DD/MM/YYYY',
          maintenanceMode: remote.maintenanceMode || false,
          allowRegistration: remote.allowRegistration ?? true,
          defaultTrialDays: remote.defaultTrialDays || 14,
          sessionTimeout: remote.sessionTimeout || 60,
          passwordMinLength: remote.passwordMinLength || 8,
          twoFactorRequired: remote.twoFactorRequired || false,
          backupEnabled: remote.backupEnabled ?? true,
          backupTime: remote.backupTime || '02:00',
          retentionDays: remote.retentionDays || 30,
          rateLimitPerMinute: remote.rateLimitPerMinute || 60,
          webhookRetryCount: remote.webhookRetryCount || 3,
          billingEnabled: remote.billingEnabled ?? true,
          apiKey: settings.apiKey,
          webhookSecret: settings.webhookSecret,
        });
      }
    } catch (err) {
      // Use defaults if backend is not available yet
      console.warn('Could not load platform settings from backend, using defaults');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadSettings(); }, [loadSettings]);

  const handleSave = async () => {
    setSaving(true);
    setFieldErrors({});
    try {
      await apiService.updatePlatformConfig({
        platformName: settings.companyBrandName,
        companyBrandName: settings.companyBrandName,
        supportEmail: settings.supportEmail,
        supportPhone: settings.supportPhone,
        logo: settings.logo,
        defaultCurrency: settings.defaultCurrency,
        timezone: settings.timezone,
        dateFormat: settings.dateFormat,
        maintenanceMode: settings.maintenanceMode,
        allowRegistration: settings.allowRegistration,
        defaultTrialDays: settings.defaultTrialDays,
        sessionTimeout: settings.sessionTimeout,
        passwordMinLength: settings.passwordMinLength,
        twoFactorRequired: settings.twoFactorRequired,
        backupEnabled: settings.backupEnabled,
        backupTime: settings.backupTime,
        retentionDays: settings.retentionDays,
        rateLimitPerMinute: settings.rateLimitPerMinute,
        webhookRetryCount: settings.webhookRetryCount,
        billingEnabled: settings.billingEnabled,
      });
      toast.success('Settings saved successfully');
    } catch (err) {
      const errData = err.response?.data;
      if (errData?.code === 'VALIDATION_ERROR' && Array.isArray(errData.errors)) {
        // Show per-field validation errors inline
        const errors = {};
        errData.errors.forEach((e) => {
          if (e.field) errors[e.field] = e.message;
        });
        setFieldErrors(errors);
        toast.error('Please fix the highlighted errors');
      } else {
        toast.error(errData?.message || 'Failed to save settings');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleSendAnnouncement = async () => {
    if (!announcementSubject.trim() || !announcementMessage.trim()) {
      toast.error('Please enter both subject and message');
      return;
    }
    setSendingAnnouncement(true);
    setAnnouncementResult(null);
    try {
      const res = await apiService.sendAnnouncement({
        subject: `[${announcementType.toUpperCase()}] ${announcementSubject}`,
        message: announcementMessage,
        type: announcementType,
      });
      const data = res.data?.data || {};
      setAnnouncementResult({
        success: true,
        message: `Announcement sent to ${data.sentCount} shop(s). ${data.failCount > 0 ? `${data.failCount} failed.` : ''}`,
        failedEmails: data.failedEmails || [],
      });
      toast.success(res.data?.message || 'Announcement sent successfully');
      setAnnouncementSubject('');
      setAnnouncementMessage('');
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to send announcement';
      setAnnouncementResult({ success: false, message: msg });
      toast.error(msg);
    } finally {
      setSendingAnnouncement(false);
    }
  };

  const handleChange = (field, value) => {
    setSettings(prev => ({ ...prev, [field]: value }));
    // Clear the field error when user starts typing
    if (fieldErrors[field]) {
      setFieldErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="space-y-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="card p-6">
              <div className="h-6 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-4" />
              <div className="space-y-3">
                {[1, 2, 3].map(j => (
                  <div key={j} className="h-10 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Platform Settings</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Configure global platform settings and preferences
          </p>
        </div>
      </div>

      {/* Send Announcement / Mass Email */}
      <SettingsSection icon={FiSend} title="Send Announcement" description="Send email to all active shop admins">
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-2">
            <FiUsers className="w-4 h-4" />
            <span>This will send an email to all active shop administrators</span>
          </div>
          <FormField label="Subject" description="Email subject line">
            <input
              type="text"
              value={announcementSubject}
              onChange={(e) => setAnnouncementSubject(e.target.value)}
              placeholder="e.g. Special Offer - 20% Discount on Premium Plan"
              className="input-field"
            />
          </FormField>
          <FormField label="Message (HTML)" description="Email body content. HTML supported.">
            <textarea
              value={announcementMessage}
              onChange={(e) => setAnnouncementMessage(e.target.value)}
              placeholder="Write your announcement message here..."
              className="input-field min-h-[120px]"
              rows={5}
            />
          </FormField>
          <div className="flex items-center gap-2">
            <select
              value={announcementType}
              onChange={(e) => setAnnouncementType(e.target.value)}
              className="input-field w-48"
            >
              <option value="general">General Announcement</option>
              <option value="offer">Offer / Sale</option>
              <option value="reminder">Reminder</option>
              <option value="update">Platform Update</option>
            </select>
            <button
              onClick={handleSendAnnouncement}
              disabled={sendingAnnouncement || !announcementSubject.trim() || !announcementMessage.trim()}
              className="btn-primary flex items-center gap-2"
            >
              <FiSend className="w-4 h-4" />
              {sendingAnnouncement ? 'Sending...' : 'Send to All Shops'}
            </button>
          </div>
          {announcementResult && (
            <div className={`p-3 rounded-lg text-sm ${
              announcementResult.success
                ? 'bg-success-50 dark:bg-success-900/20 text-success-700 dark:text-success-300 border border-success-200 dark:border-success-800'
                : 'bg-danger-50 dark:bg-danger-900/20 text-danger-700 dark:text-danger-300 border border-danger-200 dark:border-danger-800'
            }`}>
              <p>{announcementResult.message}</p>
              {announcementResult.failedEmails?.length > 0 && (
                <p className="text-xs mt-1">Failed: {announcementResult.failedEmails.join(', ')}</p>
              )}
            </div>
          )}
        </div>
      </SettingsSection>

      {/* General Settings */}
      <SettingsSection icon={FiGlobe} title="General" description="Basic platform information">
        <FormField label="Platform Logo" description="Upload logo for header display and browser tab icon">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 flex items-center justify-center overflow-hidden flex-shrink-0">
              {settings.logo ? (
                <img src={settings.logo} alt="Platform Logo" className="w-full h-full object-cover" />
              ) : (
                <FiImage className="w-5 h-5 text-gray-400" />
              )}
            </div>
            <div className="flex-1">
              <input
                type="file"
                accept="image/*"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const formData = new FormData();
                  formData.append('file', file);
                  formData.append('purpose', 'logo');
                  try {
                    const res = await apiService.uploadFile(formData);
                    const url = res.data?.data?.url || res.data?.url;
                    if (url) {
                      setSettings(prev => ({ ...prev, logo: url }));
                      toast.success('Logo uploaded successfully');
                    } else {
                      toast.error('Upload completed but no URL returned');
                    }
                  } catch (err) {
                    toast.error(err.response?.data?.message || 'Failed to upload logo');
                  }
                  e.target.value = '';
                }}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary-50 file:text-primary-600 hover:file:bg-primary-100 dark:file:bg-primary-900/30 dark:file:text-primary-400"
              />
              <p className="mt-1 text-xs text-gray-400">Recommended: 200x200px. PNG or JPG.</p>
            </div>
            {settings.logo && (
              <button
                onClick={() => setSettings(prev => ({ ...prev, logo: '' }))}
                className="text-xs text-danger-500 hover:text-danger-600 font-medium"
              >
                Remove
              </button>
            )}
          </div>
        </FormField>
        <FormField
          label="Company / Brand Name"
          description="Your company name shown across the website for branding"
          error={fieldErrors.companyBrandName || fieldErrors.platformName}
        >
          <input
            type="text"
            value={settings.companyBrandName}
            onChange={(e) => handleChange('companyBrandName', e.target.value)}
            className="input-field"
            placeholder="e.g. Your Company Name"
          />
        </FormField>
        <FormField label="Support Email" description="Contact email for support inquiries" error={fieldErrors.supportEmail}>
          <input
            type="email"
            value={settings.supportEmail}
            onChange={(e) => handleChange('supportEmail', e.target.value)}
            className="input-field"
          />
        </FormField>
        <FormField label="Support Phone" description="Contact phone number" error={fieldErrors.supportPhone}>
          <input
            type="text"
            value={settings.supportPhone}
            onChange={(e) => handleChange('supportPhone', e.target.value)}
            className="input-field"
          />
        </FormField>
        <FormField label="Default Trial Days" description="Trial period for new shops" error={fieldErrors.defaultTrialDays}>
          <input
            type="number"
            value={settings.defaultTrialDays}
            onChange={(e) => handleChange('defaultTrialDays', parseInt(e.target.value))}
            className="input-field"
            min={0}
            max={90}
          />
        </FormField>
        <FormField label="Enable Billing" description="Show billing tab to shop admins. Disable to hide billing from all shops.">
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.billingEnabled}
              onChange={(e) => handleChange('billingEnabled', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600" />
          </label>
          {!settings.billingEnabled && (
            <div className="mt-2 flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-2">
              <FiAlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>Billing tab is hidden from all shop admins.</span>
            </div>
          )}
        </FormField>
      </SettingsSection>

      {/* Regional Settings */}
      <SettingsSection icon={FiDollarSign} title="Regional" description="Currency, timezone, and date preferences">
        <FormField label="Default Currency" description="Default currency for all shops">
          <select
            value={settings.defaultCurrency}
            onChange={(e) => handleChange('defaultCurrency', e.target.value)}
            className="input-field"
          >
            <option value="INR">INR - Indian Rupee</option>
            <option value="USD">USD - US Dollar</option>
            <option value="EUR">EUR - Euro</option>
            <option value="GBP">GBP - British Pound</option>
          </select>
        </FormField>
        <FormField label="Timezone" description="Default timezone for the platform">
          <select
            value={settings.timezone}
            onChange={(e) => handleChange('timezone', e.target.value)}
            className="input-field"
          >
            <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
            <option value="Asia/Dubai">Asia/Dubai (GST)</option>
            <option value="UTC">UTC</option>
            <option value="America/New_York">America/New_York (EST)</option>
          </select>
        </FormField>
        <FormField label="Date Format" description="Default date display format">
          <select
            value={settings.dateFormat}
            onChange={(e) => handleChange('dateFormat', e.target.value)}
            className="input-field"
          >
            <option value="DD/MM/YYYY">DD/MM/YYYY</option>
            <option value="MM/DD/YYYY">MM/DD/YYYY</option>
            <option value="YYYY-MM-DD">YYYY-MM-DD</option>
          </select>
        </FormField>
      </SettingsSection>

      {/* Security Settings */}
      <SettingsSection icon={FiLock} title="Security" description="Authentication and access control">
        <FormField label="Session Timeout" description="Minutes before idle session expires (0 = never)" error={fieldErrors.sessionTimeout}>
          <input
            type="number"
            value={settings.sessionTimeout}
            onChange={(e) => handleChange('sessionTimeout', parseInt(e.target.value))}
            className="input-field"
            min={0}
          />
        </FormField>
        <FormField label="Minimum Password Length" description="Minimum characters required for passwords" error={fieldErrors.passwordMinLength}>
          <input
            type="number"
            value={settings.passwordMinLength}
            onChange={(e) => handleChange('passwordMinLength', parseInt(e.target.value))}
            className="input-field"
            min={6}
            max={128}
          />
        </FormField>
        <FormField label="Require 2FA" description="Force two-factor authentication for all admins">
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.twoFactorRequired}
              onChange={(e) => handleChange('twoFactorRequired', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600" />
          </label>
        </FormField>
        <FormField label="Allow Registration" description="Allow new shop registration without approval">
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.allowRegistration}
              onChange={(e) => handleChange('allowRegistration', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600" />
          </label>
        </FormField>
      </SettingsSection>

      {/* API & Integrations */}
      <SettingsSection icon={FiShield} title="API & Integrations" description="API keys and webhook configuration">
        <ApiKeyDisplay
          label="API Key"
          value={settings.apiKey}
          onRegenerate={() => {
            const newKey = 'mag_' + Array.from({ length: 32 }, () => Math.random().toString(36)[2]).join('');
            handleChange('apiKey', newKey);
            toast.success('API key regenerated');
          }}
        />
        <ApiKeyDisplay
          label="Webhook Secret"
          value={settings.webhookSecret}
          onRegenerate={() => {
            const newSecret = 'whsec_' + Array.from({ length: 24 }, () => Math.random().toString(36)[2]).join('');
            handleChange('webhookSecret', newSecret);
            toast.success('Webhook secret regenerated');
          }}
        />
        <FormField label="Rate Limit" description="Maximum API requests per minute" error={fieldErrors.rateLimitPerMinute}>
          <input
            type="number"
            value={settings.rateLimitPerMinute}
            onChange={(e) => handleChange('rateLimitPerMinute', parseInt(e.target.value))}
            className="input-field"
            min={1}
          />
        </FormField>
        <FormField label="Webhook Retry Count" description="Number of retries for failed webhooks" error={fieldErrors.webhookRetryCount}>
          <input
            type="number"
            value={settings.webhookRetryCount}
            onChange={(e) => handleChange('webhookRetryCount', parseInt(e.target.value))}
            className="input-field"
            min={0}
            max={10}
          />
        </FormField>
      </SettingsSection>

      {/* Maintenance */}
      <SettingsSection icon={FiServer} title="Maintenance" description="Backup and system preferences">
        <FormField label="Maintenance Mode" description="Disable access for non-admin users">
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.maintenanceMode}
              onChange={(e) => {
                if (e.target.checked) {
                  setMaintenancePendingAction('enable');
                  setShowMaintenanceConfirm(true);
                } else {
                  setMaintenancePendingAction('disable');
                  setShowMaintenanceConfirm(true);
                }
              }}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600" />
          </label>
          {settings.maintenanceMode && (
            <div className="mt-2 flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-2">
              <FiAlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>All shops are currently disabled. Only super admins can access the system.</span>
            </div>
          )}
        </FormField>
        <FormField label="Auto Backup" description="Enable automatic database backups">
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.backupEnabled}
              onChange={(e) => handleChange('backupEnabled', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600" />
          </label>
        </FormField>
        {settings.backupEnabled && (
          <>
            <FormField label="Backup Time" description="Daily backup schedule (24h format)" error={fieldErrors.backupTime}>
              <input
                type="time"
                value={settings.backupTime}
                onChange={(e) => handleChange('backupTime', e.target.value)}
                className="input-field"
              />
            </FormField>
            <FormField label="Retention Period" description="Days to keep backups" error={fieldErrors.retentionDays}>
              <input
                type="number"
                value={settings.retentionDays}
                onChange={(e) => handleChange('retentionDays', parseInt(e.target.value))}
                className="input-field"
                min={1}
                max={365}
              />
            </FormField>
          </>
        )}
      </SettingsSection>

      {/* Save footer */}
      <div className="sticky bottom-0 bg-white dark:bg-gray-800 border-t dark:border-gray-700 px-6 py-4 -mx-6 -mb-6 mt-6 flex items-center justify-between">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Changes are applied globally across all shops
        </p>
        <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2">
          <FiSave className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      {/* Maintenance Mode Confirmation Modal */}
      {showMaintenanceConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fade-in" onClick={(e) => {
          if (e.target === e.currentTarget) {
            setShowMaintenanceConfirm(false);
            setMaintenancePendingAction(null);
          }
        }}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className={`p-5 ${maintenancePendingAction === 'enable' ? 'bg-amber-50 dark:bg-amber-900/20' : 'bg-green-50 dark:bg-green-900/20'}`}>
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                  maintenancePendingAction === 'enable'
                    ? 'bg-amber-100 dark:bg-amber-900/30'
                    : 'bg-green-100 dark:bg-green-900/30'
                }`}>
                  {maintenancePendingAction === 'enable' ? (
                    <FiAlertTriangle className="w-6 h-6 text-amber-500" />
                  ) : (
                    <FiCheck className="w-6 h-6 text-green-500" />
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {maintenancePendingAction === 'enable' ? 'Enable Maintenance Mode?' : 'Disable Maintenance Mode?'}
                  </h3>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4">
              {maintenancePendingAction === 'enable' ? (
                <>
                  <div className="flex items-start gap-2 text-sm text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-700 rounded-lg p-3">
                    <FiAlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <p>This will immediately disable ALL active shops. Shop admins and staff will not be able to access the system until maintenance mode is turned off.</p>
                  </div>
                  <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 flex-shrink-0" />
                      <span>All shop admin accounts remain intact</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 flex-shrink-0" />
                      <span>Super admin can still access all areas</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 flex-shrink-0" />
                      <span>Shops will be automatically re-enabled when maintenance ends</span>
                    </li>
                  </ul>
                </>
              ) : (
                <>
                  <div className="flex items-start gap-2 text-sm text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-700 rounded-lg p-3">
                    <FiCheck className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <p>All shops that were disabled by maintenance mode will be re-enabled and accessible to their admins.</p>
                  </div>
                </>
              )}
            </div>

            {/* Actions */}
            <div className="px-5 pb-5 flex gap-3">
              <button
                onClick={() => {
                  setShowMaintenanceConfirm(false);
                  setMaintenancePendingAction(null);
                }}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  handleChange('maintenanceMode', maintenancePendingAction === 'enable');
                  setShowMaintenanceConfirm(false);
                  setMaintenancePendingAction(null);
                }}
                className={`flex-1 text-white font-medium rounded-lg px-4 py-2.5 text-sm transition-colors ${
                  maintenancePendingAction === 'enable'
                    ? 'bg-amber-500 hover:bg-amber-600'
                    : 'bg-green-500 hover:bg-green-600'
                }`}
              >
                {maintenancePendingAction === 'enable' ? 'Yes, Enable Maintenance' : 'Yes, Disable Maintenance'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
