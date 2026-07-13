import React, { useState, useEffect, useCallback } from 'react';
import {
  FiShield, FiGlobe, FiMail, FiClock, FiDollarSign,
  FiRefreshCw, FiSave, FiServer, FiDatabase, FiLock,
  FiEye, FiEyeOff, FiCopy, FiCheck, FiSend, FiMessageSquare,
  FiUsers, FiAlertCircle,
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
function FormField({ label, description, children }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4">
      <div className="flex-1">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
        {description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>}
      </div>
      <div className="sm:w-72">
        {children}
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
  const [announcementSubject, setAnnouncementSubject] = useState('');
  const [announcementMessage, setAnnouncementMessage] = useState('');
  const [announcementType, setAnnouncementType] = useState('general');
  const [sendingAnnouncement, setSendingAnnouncement] = useState(false);
  const [announcementResult, setAnnouncementResult] = useState(null);
  const [settings, setSettings] = useState({
    platformName: 'Future Magnus Business OS',
    supportEmail: 'support@futuremagnus.com',
    supportPhone: '+91-9999999999',
    defaultCurrency: 'INR',
    timezone: 'Asia/Kolkata',
    dateFormat: 'DD/MM/YYYY',
    maintenanceMode: false,
    allowRegistration: true,
    defaultTrialDays: 14,
    maxShopsPerAdmin: 100,
    sessionTimeout: 60,
    passwordMinLength: 8,
    twoFactorRequired: false,
    backupEnabled: true,
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
      if (remote && remote.platformName) {
        setSettings({
          platformName: remote.platformName || 'Future Magnus Business OS',
          supportEmail: remote.supportEmail || 'support@futuremagnus.com',
          supportPhone: remote.supportPhone || '+91-9999999999',
          defaultCurrency: remote.defaultCurrency || 'INR',
          timezone: remote.timezone || 'Asia/Kolkata',
          dateFormat: remote.dateFormat || 'DD/MM/YYYY',
          maintenanceMode: remote.maintenanceMode || false,
          allowRegistration: remote.allowRegistration ?? true,
          defaultTrialDays: remote.defaultTrialDays || 14,
          maxShopsPerAdmin: remote.maxShopsPerAdmin || 100,
          sessionTimeout: remote.sessionTimeout || 60,
          passwordMinLength: remote.passwordMinLength || 8,
          twoFactorRequired: remote.twoFactorRequired || false,
          backupEnabled: remote.backupEnabled ?? true,
          backupTime: remote.backupTime || '02:00',
          retentionDays: remote.retentionDays || 30,
          rateLimitPerMinute: remote.rateLimitPerMinute || 60,
          webhookRetryCount: remote.webhookRetryCount || 3,
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
    try {
      await apiService.updatePlatformConfig({
        platformName: settings.platformName,
        supportEmail: settings.supportEmail,
        supportPhone: settings.supportPhone,
        defaultCurrency: settings.defaultCurrency,
        timezone: settings.timezone,
        dateFormat: settings.dateFormat,
        maintenanceMode: settings.maintenanceMode,
        allowRegistration: settings.allowRegistration,
        defaultTrialDays: settings.defaultTrialDays,
        maxShopsPerAdmin: settings.maxShopsPerAdmin,
        sessionTimeout: settings.sessionTimeout,
        passwordMinLength: settings.passwordMinLength,
        twoFactorRequired: settings.twoFactorRequired,
        backupEnabled: settings.backupEnabled,
        backupTime: settings.backupTime,
        retentionDays: settings.retentionDays,
        rateLimitPerMinute: settings.rateLimitPerMinute,
        webhookRetryCount: settings.webhookRetryCount,
      });
      toast.success('Settings saved successfully');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save settings');
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
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary flex items-center gap-2"
        >
          <FiSave className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
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
        <FormField label="Platform Name" description="The name displayed across the platform">
          <input
            type="text"
            value={settings.platformName}
            onChange={(e) => handleChange('platformName', e.target.value)}
            className="input-field"
          />
        </FormField>
        <FormField label="Support Email" description="Contact email for support inquiries">
          <input
            type="email"
            value={settings.supportEmail}
            onChange={(e) => handleChange('supportEmail', e.target.value)}
            className="input-field"
          />
        </FormField>
        <FormField label="Support Phone" description="Contact phone number">
          <input
            type="text"
            value={settings.supportPhone}
            onChange={(e) => handleChange('supportPhone', e.target.value)}
            className="input-field"
          />
        </FormField>
        <FormField label="Default Trial Days" description="Trial period for new shops">
          <input
            type="number"
            value={settings.defaultTrialDays}
            onChange={(e) => handleChange('defaultTrialDays', parseInt(e.target.value))}
            className="input-field"
            min={0}
            max={90}
          />
        </FormField>
        <FormField label="Max Shops per Admin" description="Maximum shops a super admin can manage">
          <input
            type="number"
            value={settings.maxShopsPerAdmin}
            onChange={(e) => handleChange('maxShopsPerAdmin', parseInt(e.target.value))}
            className="input-field"
            min={1}
          />
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
        <FormField label="Session Timeout" description="Minutes before idle session expires (0 = never)">
          <input
            type="number"
            value={settings.sessionTimeout}
            onChange={(e) => handleChange('sessionTimeout', parseInt(e.target.value))}
            className="input-field"
            min={0}
          />
        </FormField>
        <FormField label="Minimum Password Length" description="Minimum characters required for passwords">
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
        <FormField label="Rate Limit" description="Maximum API requests per minute">
          <input
            type="number"
            value={settings.rateLimitPerMinute}
            onChange={(e) => handleChange('rateLimitPerMinute', parseInt(e.target.value))}
            className="input-field"
            min={1}
          />
        </FormField>
        <FormField label="Webhook Retry Count" description="Number of retries for failed webhooks">
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
              onChange={(e) => handleChange('maintenanceMode', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600" />
          </label>
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
            <FormField label="Backup Time" description="Daily backup schedule (24h format)">
              <input
                type="time"
                value={settings.backupTime}
                onChange={(e) => handleChange('backupTime', e.target.value)}
                className="input-field"
              />
            </FormField>
            <FormField label="Retention Period" description="Days to keep backups">
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
    </div>
  );
}
