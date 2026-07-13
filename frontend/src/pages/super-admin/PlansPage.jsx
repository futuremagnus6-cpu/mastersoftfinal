import React, { useState, useEffect, useCallback } from 'react';
import {
  FiPlus, FiEdit2, FiTrash2, FiRefreshCw, FiX, FiCheck,
  FiStar, FiUsers, FiPackage, FiLayers, FiHardDrive,
  FiDollarSign, FiCalendar, FiCreditCard,
} from 'react-icons/fi';
import { apiService } from '../../services/api';
import toast from 'react-hot-toast';

// ─── Feature Toggle ───
function FeatureToggle({ label, value, onChange }) {
  return (
    <label className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer">
      <div
        onClick={(e) => { e.preventDefault(); onChange(!value); }}
        className={`relative w-10 h-5 rounded-full transition-colors cursor-pointer flex-shrink-0 ${
          value ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-600'
        }`}
      >
        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
          value ? 'translate-x-5' : 'translate-x-0.5'
        }`} />
      </div>
      <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
    </label>
  );
}

// ─── Plan Modal ───
function PlanModal({ plan, onClose, onSave }) {
  const [form, setForm] = useState({
    name: plan?.name || '',
    description: plan?.description || '',
    monthlyPrice: plan?.monthlyPrice || 0,
    semiAnnualPrice: plan?.semiAnnualPrice || undefined,
    annualPrice: plan?.annualPrice || undefined,
    trialPeriod: plan?.trialPeriod || 14,
    sortOrder: plan?.sortOrder || 0,
    supportLevel: plan?.supportLevel || 'email',
    whiteLabel: plan?.whiteLabel || false,
    apiAccess: plan?.apiAccess || false,
    limits: {
      maxUsers: plan?.limits?.maxUsers || 5,
      maxProducts: plan?.limits?.maxProducts || 1000,
      maxBranches: plan?.limits?.maxBranches || 1,
      maxStorage: plan?.limits?.maxStorage || 5,
    },
    features: {
      pos: plan?.features?.pos ?? true,
      inventory: plan?.features?.inventory ?? true,
      crm: plan?.features?.crm ?? false,
      suppliers: plan?.features?.suppliers ?? false,
      purchases: plan?.features?.purchases ?? false,
      expenses: plan?.features?.expenses ?? false,
      employees: plan?.features?.employees ?? false,
      multiBranch: plan?.features?.multiBranch ?? false,
      loyalty: plan?.features?.loyalty ?? false,
      ecommerce: plan?.features?.ecommerce ?? false,
      barcodeScanner: plan?.features?.barcodeScanner ?? false,
      thermalPrinter: plan?.features?.thermalPrinter ?? false,
      whatsappNotifications: plan?.features?.whatsappNotifications ?? false,
      emailNotifications: plan?.features?.emailNotifications ?? true,
      lowStockAlerts: plan?.features?.lowStockAlerts ?? true,
      expiryAlerts: plan?.features?.expiryAlerts ?? true,
      gstModule: plan?.features?.gstModule ?? true,
      referralSystem: plan?.features?.referralSystem ?? false,
      aiForecasting: plan?.features?.aiForecasting ?? false,
      customerPortal: plan?.features?.customerPortal ?? false,
      offlinePos: plan?.features?.offlinePos ?? false,
      autoBackup: plan?.features?.autoBackup ?? false,
      multiLanguage: plan?.features?.multiLanguage ?? false,
    },
  });
  const [saving, setSaving] = useState(false);

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleLimitChange = (field, value) => {
    setForm(prev => ({ ...prev, limits: { ...prev.limits, [field]: parseInt(value) || 0 } }));
  };

  const handleFeatureToggle = (feature, value) => {
    setForm(prev => ({ ...prev, features: { ...prev.features, [feature]: value } }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (plan) {
        await apiService.updatePlan(plan._id, form);
        toast.success('Plan updated successfully');
      } else {
        await apiService.createPlan(form);
        toast.success('Plan created successfully');
      }
      onSave();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save plan');
    } finally {
      setSaving(false);
    }
  };

  const featureGroups = [
    {
      title: 'Core',
      features: [
        { key: 'pos', label: 'POS Terminal' },
        { key: 'inventory', label: 'Inventory Management' },
        { key: 'crm', label: 'CRM / Customer Management' },
        { key: 'suppliers', label: 'Supplier Management' },
        { key: 'purchases', label: 'Purchase Management' },
        { key: 'expenses', label: 'Expense Tracking' },
        { key: 'employees', label: 'Employee Management' },
      ],
    },
    {
      title: 'Advanced',
      features: [
        { key: 'multiBranch', label: 'Multi-Branch Support' },
        { key: 'loyalty', label: 'Loyalty Program' },
        { key: 'ecommerce', label: 'E-Commerce Integration' },
        { key: 'customerPortal', label: 'Customer Portal' },
        { key: 'referralSystem', label: 'Referral System' },
        { key: 'aiForecasting', label: 'AI Demand Forecasting' },
      ],
    },
    {
      title: 'Features',
      features: [
        { key: 'barcodeScanner', label: 'Barcode Scanner' },
        { key: 'thermalPrinter', label: 'Thermal Printer Support' },
        { key: 'whatsappNotifications', label: 'WhatsApp Notifications' },
        { key: 'emailNotifications', label: 'Email Notifications' },
        { key: 'lowStockAlerts', label: 'Low Stock Alerts' },
        { key: 'expiryAlerts', label: 'Expiry Alerts' },
        { key: 'gstModule', label: 'GST Module' },
        { key: 'offlinePos', label: 'Offline POS Mode' },
        { key: 'autoBackup', label: 'Auto Backup' },
        { key: 'multiLanguage', label: 'Multi-Language Support' },
      ],
    },
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content max-w-3xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            {plan ? 'Edit Plan' : 'Create New Plan'}
          </h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400">
            <FiX className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Plan Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Plan Name *</label>
                <input type="text" value={form.name} onChange={e => handleChange('name', e.target.value)} className="input-field" required placeholder="e.g. Business Pro" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                <textarea value={form.description} onChange={e => handleChange('description', e.target.value)} className="input-field" rows={2} placeholder="Describe what this plan includes..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Monthly Price (₹)
                  <span className="text-[10px] text-gray-400 font-normal ml-1">/mo</span>
                </label>
                <input type="number" value={form.monthlyPrice} onChange={e => handleChange('monthlyPrice', parseFloat(e.target.value) || 0)} className="input-field" min={0} step={0.01} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  6-Month Price (₹)
                  <span className="text-[10px] text-gray-400 font-normal ml-1">leave blank for 5% discount</span>
                </label>
                <input type="number" value={form.semiAnnualPrice ?? ''} onChange={e => handleChange('semiAnnualPrice', e.target.value ? parseFloat(e.target.value) : undefined)} className="input-field" min={0} step={0.01} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Annual Price (₹)
                  <span className="text-[10px] text-gray-400 font-normal ml-1">leave blank for 10% discount</span>
                </label>
                <input type="number" value={form.annualPrice ?? ''} onChange={e => handleChange('annualPrice', e.target.value ? parseFloat(e.target.value) : undefined)} className="input-field" min={0} step={0.01} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Trial Period (days)</label>
                <input type="number" value={form.trialPeriod} onChange={e => handleChange('trialPeriod', parseInt(e.target.value) || 0)} className="input-field" min={0} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sort Order</label>
                <input type="number" value={form.sortOrder} onChange={e => handleChange('sortOrder', parseInt(e.target.value) || 0)} className="input-field" min={0} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Support Level</label>
                <select value={form.supportLevel} onChange={e => handleChange('supportLevel', e.target.value)} className="input-field">
                  <option value="email">Email Support</option>
                  <option value="chat">Chat Support</option>
                  <option value="dedicated">Dedicated Support</option>
                </select>
              </div>
              <div className="flex items-center gap-6 pt-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.apiAccess} onChange={e => handleChange('apiAccess', e.target.checked)} className="w-4 h-4 text-primary-600 rounded" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">API Access</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.whiteLabel} onChange={e => handleChange('whiteLabel', e.target.checked)} className="w-4 h-4 text-primary-600 rounded" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">White Label</span>
                </label>
              </div>
            </div>
          </div>

          {/* Limits */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Limits</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  <FiUsers className="w-3.5 h-3.5 inline mr-1" /> Max Users
                </label>
                <input type="number" value={form.limits.maxUsers} onChange={e => handleLimitChange('maxUsers', e.target.value)} className="input-field" min={1} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  <FiPackage className="w-3.5 h-3.5 inline mr-1" /> Max Products
                </label>
                <input type="number" value={form.limits.maxProducts} onChange={e => handleLimitChange('maxProducts', e.target.value)} className="input-field" min={1} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  <FiLayers className="w-3.5 h-3.5 inline mr-1" /> Max Branches
                </label>
                <input type="number" value={form.limits.maxBranches} onChange={e => handleLimitChange('maxBranches', e.target.value)} className="input-field" min={1} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  <FiHardDrive className="w-3.5 h-3.5 inline mr-1" /> Storage (GB)
                </label>
                <input type="number" value={form.limits.maxStorage} onChange={e => handleLimitChange('maxStorage', e.target.value)} className="input-field" min={1} />
              </div>
            </div>
          </div>

          {/* Features */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Features</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {featureGroups.map(group => (
                <div key={group.title} className="card">
                  <div className="card-header">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white">{group.title}</h4>
                  </div>
                  <div className="p-2">
                    {group.features.map(f => (
                      <FeatureToggle
                        key={f.key}
                        label={f.label}
                        value={form.features[f.key]}
                        onChange={(val) => handleFeatureToggle(f.key, val)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-4 border-t dark:border-gray-700">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? 'Saving...' : plan ? 'Update Plan' : 'Create Plan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Plan Card ───
function PlanCard({ plan, onEdit, onDelete }) {
  const priceFormatted = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(plan.monthlyPrice);
  const annualFormatted = plan.annualPrice ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(plan.annualPrice) : null;
  const featuresList = Object.entries(plan.features || {}).filter(([, v]) => v).map(([k]) => k.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()));

  return (
    <div className="card relative overflow-hidden hover:shadow-md transition-shadow">
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">{plan.name}</h3>
            {plan.description && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{plan.description}</p>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => onEdit(plan)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400" title="Edit">
              <FiEdit2 className="w-4 h-4" />
            </button>
            <button onClick={() => onDelete(plan)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-danger-400" title="Delete">
              <FiTrash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="mb-4">
          <span className="text-3xl font-bold text-gray-900 dark:text-white">{priceFormatted}</span>
          <span className="text-sm text-gray-500 dark:text-gray-400">/month</span>
          {plan.semiAnnualPrice && (
            <p className="text-xs text-primary-600 dark:text-primary-400 mt-0.5">
              ₹{plan.semiAnnualPrice.toLocaleString('en-IN')}/6mo ({(plan.semiAnnualPrice / plan.monthlyPrice / 6 * 100).toFixed(0)}% savings)
            </p>
          )}
          {annualFormatted && (
            <p className="text-xs text-success-600 dark:text-success-400 mt-1">
              {annualFormatted}/year ({(plan.annualPrice / plan.monthlyPrice / 12 * 100).toFixed(0)}% savings)
            </p>
          )}
        </div>

        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <FiUsers className="w-4 h-4" />
            <span>Up to {plan.limits?.maxUsers || 5} users</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <FiPackage className="w-4 h-4" />
            <span>Up to {plan.limits?.maxProducts || 1000} products</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <FiLayers className="w-4 h-4" />
            <span>Up to {plan.limits?.maxBranches || 1} branches</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <FiCalendar className="w-4 h-4" />
            <span>{plan.trialPeriod || 14}-day trial</span>
          </div>
        </div>

        <div className="border-t dark:border-gray-700 pt-4">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Features ({featuresList.length})</p>
          <div className="flex flex-wrap gap-1.5">
            {featuresList.slice(0, 8).map((f, i) => (
              <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 rounded-full text-xs">
                <FiCheck className="w-3 h-3" />
                {f}
              </span>
            ))}
            {featuresList.length > 8 && (
              <span className="text-xs text-gray-400">+{featuresList.length - 8} more</span>
            )}
          </div>
        </div>

        <div className="mt-4 pt-4 border-t dark:border-gray-700 flex items-center justify-between text-xs text-gray-500">
          <span>Support: <span className="capitalize font-medium">{plan.supportLevel || 'email'}</span></span>
          <span className={`badge ${plan.isActive ? 'badge-success' : 'badge-warning'}`}>
            {plan.isActive ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Main Plans Page ───
export default function PlansPage() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);

  const loadPlans = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiService.getPlans();
      const data = res.data?.data || res.data || [];
      setPlans(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error('Failed to load plans');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadPlans(); }, [loadPlans]);

  const handleEdit = (plan) => {
    setSelectedPlan(plan);
    setShowModal(true);
  };

  const handleDelete = async (plan) => {
    if (!window.confirm(`Deactivate plan "${plan.name}"? This cannot be undone.`)) return;
    try {
      await apiService.deletePlan(plan._id);
      toast.success('Plan deactivated');
      loadPlans();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to deactivate plan');
    }
  };

  return (
    <div className="page-container">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Subscription Plans</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage subscription plans, pricing, and feature flags
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={loadPlans} disabled={loading} className="btn-secondary flex items-center gap-2">
            <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => { setSelectedPlan(null); setShowModal(true); }}
            className="btn-primary flex items-center gap-2"
          >
            <FiPlus className="w-4 h-4" />
            New Plan
          </button>
        </div>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="card p-6">
              <div className="h-5 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-4" />
              <div className="h-8 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-4" />
              <div className="space-y-2 mb-4">
                {[1, 2, 3].map(j => (
                  <div key={j} className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                ))}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {[1, 2, 3, 4].map(j => (
                  <div key={j} className="h-6 w-16 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : plans.length === 0 ? (
        <div className="text-center py-16">
          <FiCreditCard className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Plans Yet</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">Create your first subscription plan to get started</p>
          <button
            onClick={() => { setSelectedPlan(null); setShowModal(true); }}
            className="btn-primary inline-flex items-center gap-2"
          >
            <FiPlus className="w-4 h-4" />
            Create Plan
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map(plan => (
            <PlanCard key={plan._id} plan={plan} onEdit={handleEdit} onDelete={handleDelete} />
          ))}
        </div>
      )}

      {/* Modals */}
      {showModal && (
        <PlanModal
          plan={selectedPlan}
          onClose={() => { setShowModal(false); setSelectedPlan(null); }}
          onSave={() => { setShowModal(false); setSelectedPlan(null); loadPlans(); }}
        />
      )}
    </div>
  );
}
