import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  FiClock, FiSearch, FiRefreshCw, FiEye,
  FiPhone, FiMail, FiMapPin, FiCalendar, FiX,
  FiChevronLeft, FiChevronRight, FiShoppingBag, FiUsers,
  FiDollarSign, FiCheckCircle, FiTrash2,
  FiSend, FiPlusCircle, FiAlertTriangle,
  FiCreditCard, FiCheck, FiEdit3,
} from 'react-icons/fi';
import { apiService } from '../../services/api';
import toast from 'react-hot-toast';

// ─── Status Badge ───
function StatusBadge({ status }) {
  const colors = {
    trial: 'badge-info',
    active: 'badge-success',
    expired: 'badge-danger',
    suspended: 'badge-warning',
  };
  return <span className={colors[status] || 'badge-info'}>{status}</span>;
}

// ─── Assign Plan Modal ───
function AssignPlanModal({ shop, plans, onClose, onSuccess }) {
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [duration, setDuration] = useState(1);
  const [customAmount, setCustomAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const selectedPlan = plans.find(p => p._id === selectedPlanId);

  // Calculate price when plan or duration changes
  useEffect(() => {
    if (selectedPlan) {
      const monthly = selectedPlan.monthlyPrice || 0;
      let price = 0;
      if (duration === 12 && selectedPlan.annualPrice) price = selectedPlan.annualPrice;
      else if (duration === 6 && selectedPlan.semiAnnualPrice) price = selectedPlan.semiAnnualPrice;
      else if (duration === 3 && selectedPlan.quarterlyPrice) price = selectedPlan.quarterlyPrice;
      else price = monthly * duration;
      setCustomAmount(price.toString());
    } else {
      setCustomAmount('');
    }
  }, [selectedPlanId, duration]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPlanId) { toast.error('Please select a plan'); return; }
    setSaving(true);
    try {
      const payload = {
        shopId: shop._id,
        planId: selectedPlanId,
        duration,
        amount: parseFloat(customAmount) || 0,
        paymentMethod,
        paymentReference: paymentReference.trim() || undefined,
        paymentNotes: paymentNotes.trim() || undefined,
      };
      await apiService.assignPlan(payload);
      toast.success(`Plan assigned to ${shop.name} successfully`);
      onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to assign plan');
    } finally {
      setSaving(false);
    }
  };

  if (!shop) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="flex flex-col max-h-[85vh] w-full max-w-lg mx-4 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Fixed Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b dark:border-gray-700 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Assign Plan</h2>
            <p className="text-xs text-gray-500 mt-0.5">{shop.name}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400">
            <FiX className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body + Footer inside form for proper Enter key submission */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Plan Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Select Plan <span className="text-red-400">*</span>
            </label>
            <div className="space-y-2">
              {plans.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">No plans available. Create plans first.</p>
              ) : (
                plans.map(plan => (
                  <div
                    key={plan._id}
                    onClick={() => setSelectedPlanId(plan._id)}
                    className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedPlanId === plan._id
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 dark:border-primary-600'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          selectedPlanId === plan._id
                            ? 'border-primary-500 bg-primary-500'
                            : 'border-gray-300 dark:border-gray-500'
                        }`}>
                          {selectedPlanId === plan._id && (
                            <FiCheck className="w-3 h-3 text-white" />
                          )}
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-900 dark:text-white">{plan.name}</span>
                          <span className="text-xs text-gray-500 ml-2">₹{plan.monthlyPrice}/month</span>
                        </div>
                      </div>
                      {plan.annualPrice && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-success-50 dark:bg-success-900/20 text-success-700 dark:text-success-300 rounded">
                          Save {Math.round((1 - plan.annualPrice / (plan.monthlyPrice * 12)) * 100)}%
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Duration */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Duration</label>
            <div className="flex gap-2">
              {[1, 3, 6, 12].map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setDuration(m)}
                  className={`flex-1 py-2.5 text-sm font-medium rounded-lg border-2 transition-all ${
                    duration === m
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                      : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  {m} {m === 1 ? 'Month' : 'Months'}
                </button>
              ))}
            </div>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Amount <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">₹</span>
              <input
                type="number"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                className="input-field pl-7"
                min={0}
                step={0.01}
                required
              />
            </div>
          </div>

          {/* Payment Details */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Payment Method</label>
            <div className="flex gap-2">
              {[
                { value: 'cash', label: 'Cash', icon: FiDollarSign },
                { value: 'card', label: 'Card', icon: FiCreditCard },
                { value: 'online', label: 'Online', icon: FiSend },
                { value: 'cheque', label: 'Cheque', icon: FiCheckCircle },
                { value: 'other', label: 'Other', icon: FiDollarSign },
              ].map(m => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setPaymentMethod(m.value)}
                  className={`flex-1 py-2 px-2 text-xs font-medium rounded-lg border-2 flex flex-col items-center gap-1 transition-all ${
                    paymentMethod === m.value
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                      : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <m.icon className="w-4 h-4" />
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Reference / Transaction ID
            </label>
            <input
              type="text"
              value={paymentReference}
              onChange={(e) => setPaymentReference(e.target.value)}
              className="input-field"
              placeholder="Optional — receipt/transaction reference"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Notes
            </label>
            <textarea
              value={paymentNotes}
              onChange={(e) => setPaymentNotes(e.target.value)}
              className="input-field resize-none"
              rows={2}
              placeholder="Optional — any notes about this assignment"
            />
          </div>

          {/* Summary */}
          {selectedPlan && (
            <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Summary</p>
              <div className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                <div className="flex justify-between">
                  <span>Plan</span>
                  <span className="font-medium">{selectedPlan.name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Duration</span>
                  <span className="font-medium">{duration} month{duration > 1 ? 's' : ''}</span>
                </div>
                <div className="flex justify-between">
                  <span>Amount</span>
                  <span className="font-medium">₹{parseFloat(customAmount || 0).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between">
                  <span>Payment</span>
                  <span className="font-medium capitalize">{paymentMethod}</span>
                </div>
              </div>
            </div>
          )}
          </div>

          {/* Fixed Footer inside form */}
          <div className="px-6 py-4 border-t dark:border-gray-700 shrink-0">
            <div className="flex items-center gap-3">
              <button type="button" onClick={onClose} className="btn-secondary flex-1" disabled={saving}>
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || !selectedPlanId}
                className="btn-primary flex-1 flex items-center justify-center gap-2"
              >
                {saving ? (
                  'Assigning...'
                ) : (
                  <>
                    <FiCheckCircle className="w-4 h-4" />
                    Assign & Complete
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Trial Shop Detail Modal ───
function PreShopDetailModal({ shop, onClose, onActivate, onRefresh }) {
  const [showActivateConfirm, setShowActivateConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showCloseTrialConfirm, setShowCloseTrialConfirm] = useState(false);
  const [showExtendTrial, setShowExtendTrial] = useState(false);
  const [extendDays, setExtendDays] = useState(7);
  const [actionLoading, setActionLoading] = useState(false);

  const handleActivate = async () => {
    setActionLoading(true);
    try {
      await apiService.activateShop(shop._id);
      const now = new Date();
      await apiService.updateShop(shop._id, {
        subscription: {
          status: 'active',
          currentPeriodStart: now,
          currentPeriodEnd: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
        },
      });
      toast.success(`${shop.name} activated and moved to Shops`);
      onClose();
      onActivate();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to activate shop');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    setActionLoading(true);
    try {
      await apiService.deleteShop(shop._id);
      toast.success(`${shop.name} deleted successfully`);
      setShowDeleteConfirm(false);
      onClose();
      onRefresh();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete shop');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCloseTrial = async () => {
    setActionLoading(true);
    try {
      await apiService.closeTrial(shop._id);
      toast.success(`Trial closed for ${shop.name}`);
      setShowCloseTrialConfirm(false);
      onRefresh();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to close trial');
    } finally {
      setActionLoading(false);
    }
  };

  const handleExtendTrial = async () => {
    if (!extendDays || extendDays < 1) {
      toast.error('Please enter a valid number of days');
      return;
    }
    setActionLoading(true);
    try {
      await apiService.extendTrial(shop._id, extendDays);
      toast.success(`Trial extended by ${extendDays} days for ${shop.name}`);
      setShowExtendTrial(false);
      onRefresh();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to extend trial');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendReminder = async () => {
    setActionLoading(true);
    try {
      await apiService.sendSubscriptionReminder(shop._id);
      toast.success('Subscription reminder email sent to shop admin');
      onRefresh();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send reminder');
    } finally {
      setActionLoading(false);
    }
  };

  if (!shop) return null;

  const trialEnds = shop.subscription?.trialEndsAt ? new Date(shop.subscription.trialEndsAt) : null;
  const daysLeft = trialEnds ? Math.ceil((trialEnds - new Date()) / (1000 * 60 * 60 * 24)) : 0;

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
          {/* Trial Status */}
          <div className={`p-4 rounded-lg border ${
            daysLeft <= 3
              ? 'bg-danger-50 dark:bg-danger-900/20 border-danger-200 dark:border-danger-800'
              : 'bg-info-50 dark:bg-info-900/20 border-info-200 dark:border-info-800'
          }`}>
            <div className="flex items-center gap-2 mb-1">
              <FiClock className={`w-4 h-4 ${daysLeft <= 3 ? 'text-danger-500' : 'text-info-500'}`} />
              <span className={`text-sm font-semibold ${daysLeft <= 3 ? 'text-danger-700 dark:text-danger-300' : 'text-info-700 dark:text-info-300'}`}>
                Pre-Shop (Trial)
              </span>
            </div>
            {trialEnds && (
              <p className={`text-xs mt-1 ${daysLeft <= 3 ? 'text-danger-600' : 'text-info-600'}`}>
                Trial ends: {trialEnds.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                {' '}— <strong>{daysLeft > 0 ? `${daysLeft} day${daysLeft !== 1 ? 's' : ''} left` : 'Expired'}</strong>
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <FiShoppingBag className="w-4 h-4 text-primary-500" />
              <div>
                <p className="text-xs text-gray-400">Business Type</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {shop.businessType?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <FiCalendar className="w-4 h-4 text-primary-500" />
              <div>
                <p className="text-xs text-gray-400">Registered</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {shop.createdAt ? new Date(shop.createdAt).toLocaleDateString('en-IN') : '-'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <FiMail className="w-4 h-4 text-primary-500" />
              <div>
                <p className="text-xs text-gray-400">Email</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{shop.contact?.email || '-'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <FiPhone className="w-4 h-4 text-primary-500" />
              <div>
                <p className="text-xs text-gray-400">Phone</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{shop.contact?.phone || '-'}</p>
              </div>
            </div>
          </div>

          {shop.address && (
            <div className="flex items-start gap-2">
              <FiMapPin className="w-4 h-4 text-primary-500 mt-0.5" />
              <div>
                <p className="text-xs text-gray-400">Address</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {[shop.address.line1, shop.address.city, shop.address.state, shop.address.pincode].filter(Boolean).join(', ')}
                </p>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2">
            <FiUsers className="w-4 h-4 text-primary-500" />
            <div>
              <p className="text-xs text-gray-400">Admin / Signup Email</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">{shop.contact?.email || '-'}</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-6 border-t dark:border-gray-700 flex flex-wrap gap-2">
          <button
            onClick={() => setShowActivateConfirm(true)}
            disabled={actionLoading}
            className="btn-primary flex-1 flex items-center justify-center gap-2"
          >
            <FiCheckCircle className="w-4 h-4" />
            Activate
          </button>
          <button
            onClick={() => setShowExtendTrial(true)}
            disabled={actionLoading}
            className="btn-secondary flex items-center justify-center gap-2"
          >
            <FiPlusCircle className="w-4 h-4" />
            Extend
          </button>
          <button
            onClick={() => setShowCloseTrialConfirm(true)}
            disabled={actionLoading}
            className="btn-secondary flex items-center justify-center gap-2 text-warning-600"
          >
            <FiAlertTriangle className="w-4 h-4" />
            Close Trial
          </button>
          <button
            onClick={handleSendReminder}
            disabled={actionLoading}
            className="btn-secondary flex items-center justify-center gap-2"
          >
            <FiSend className="w-4 h-4" />
            Send Reminder
          </button>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            disabled={actionLoading}
            className="btn-secondary flex items-center justify-center gap-2 text-danger-500"
          >
            <FiTrash2 className="w-4 h-4" />
            Delete
          </button>
          <button onClick={onClose} className="btn-secondary px-4" disabled={actionLoading}>Close</button>
        </div>

        {/* Activate Confirmation */}
        {showActivateConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowActivateConfirm(false)}>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-sm" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Activate this Pre-Shop?</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
                This will mark the shop as active and move it to the main Shops page.
                It will start with a 30-day billing period.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setShowActivateConfirm(false)} className="btn-secondary flex-1" disabled={actionLoading}>
                  Cancel
                </button>
                <button onClick={handleActivate} disabled={actionLoading} className="btn-primary flex-1">
                  {actionLoading ? 'Activating...' : 'Yes, Activate'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Close Trial Confirmation */}
        {showCloseTrialConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowCloseTrialConfirm(false)}>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-sm" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Close Trial Early?</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
                This will end the trial immediately. The shop will need to subscribe to continue using the platform.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setShowCloseTrialConfirm(false)} className="btn-secondary flex-1" disabled={actionLoading}>
                  Cancel
                </button>
                <button onClick={handleCloseTrial} disabled={actionLoading} className="btn-primary bg-orange-600 hover:bg-orange-700 flex-1">
                  {actionLoading ? 'Closing...' : 'Yes, Close Trial'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowDeleteConfirm(false)}>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-sm" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-bold text-danger-600 dark:text-danger-400 mb-2">Delete this Pre-Shop?</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
                This will permanently disable this shop and deactivate all associated users. This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setShowDeleteConfirm(false)} className="btn-secondary flex-1" disabled={actionLoading}>
                  Cancel
                </button>
                <button onClick={handleDelete} disabled={actionLoading} className="btn-primary bg-danger-600 hover:bg-danger-700 flex-1">
                  {actionLoading ? 'Deleting...' : 'Delete Shop'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Extend Trial Modal */}
        {showExtendTrial && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowExtendTrial(false)}>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-sm" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Extend Trial Period</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
                How many extra days would you like to add to the trial?
              </p>
              <div className="mb-4">
                <div className="flex gap-2 mb-3">
                  {[3, 7, 14, 30].map(d => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setExtendDays(d)}
                      className={`px-3 py-1.5 text-sm rounded-lg border ${
                        extendDays === d
                          ? 'bg-primary-50 dark:bg-primary-900/30 border-primary-300 text-primary-700 dark:text-primary-300'
                          : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      +{d}d
                    </button>
                  ))}
                </div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Or custom days</label>
                <input
                  type="number"
                  value={extendDays}
                  onChange={(e) => setExtendDays(parseInt(e.target.value) || 1)}
                  className="input-field w-full"
                  min={1}
                  max={365}
                />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowExtendTrial(false)} className="btn-secondary flex-1" disabled={actionLoading}>
                  Cancel
                </button>
                <button onClick={handleExtendTrial} disabled={actionLoading} className="btn-primary flex-1">
                  {actionLoading ? 'Extending...' : `Extend by ${extendDays} days`}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Pre Shops Page ───
export default function PreShopsPage() {
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedShop, setSelectedShop] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [extendingShop, setExtendingShop] = useState(null); // shop being extended inline
  const [extendCustomDays, setExtendCustomDays] = useState(7);
  const [settingTrialShop, setSettingTrialShop] = useState(null); // shop for set trial
  const [setTrialDays, setSetTrialDays] = useState(14);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignShop, setAssignShop] = useState(null);
  const [plans, setPlans] = useState([]);

  const loadShops = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch only trial/expired subscription shops (pre-shops awaiting activation)
      const res = await apiService.getShops({
        page,
        limit: 20,
        search: search || undefined,
        subscriptionStatus: 'trial,expired',
      });
      const data = res.data?.data || [];
      setShops(Array.isArray(data) ? data : []);
      setTotalPages(res.data?.pagination?.pages || 1);
      setTotal(res.data?.pagination?.total || 0);
    } catch (err) {
      toast.error('Failed to load pre-shops');
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  const handleDeleteShop = async (shopId, shopName) => {
    if (!window.confirm(`Are you sure you want to delete ${shopName}? This will disable the shop and deactivate all users.`)) return;
    try {
      await apiService.deleteShop(shopId);
      toast.success(`${shopName} deleted`);
      loadShops();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete shop');
    }
  };

  const handleQuickExtend = async (shopId, days) => {
    try {
      await apiService.extendTrial(shopId, days);
      toast.success(`Trial extended by ${days} days`);
      loadShops();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to extend trial');
    }
  };

  const handleSetTrialDays = async (shopId, days) => {
    if (!days || days < 1) {
      toast.error('Please enter a valid number of days');
      return;
    }
    try {
      await apiService.setTrialDays(shopId, days);
      toast.success(`Trial set to ${days} days for this shop`);
      setSettingTrialShop(null);
      loadShops();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to set trial days');
    }
  };

  const handleSendReminder = async (shopId) => {
    try {
      await apiService.sendSubscriptionReminder(shopId);
      toast.success('Subscription reminder sent');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send reminder');
    }
  };

  const handleAssignPlan = async (shop) => {
    const loadingToast = toast.loading('Loading plans...');
    try {
      const res = await apiService.getPlans();
      const planList = res.data?.data || [];
      setPlans(Array.isArray(planList) ? planList.filter(p => p.isActive) : []);
      toast.dismiss(loadingToast);
    } catch (err) {
      toast.dismiss(loadingToast);
      toast.error('Failed to load plans');
    }
    setAssignShop(shop);
    setShowAssignModal(true);
  };

  useEffect(() => { loadShops(); }, [loadShops]);

  const [searchInput, setSearchInput] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => { setSearch(searchInput); setPage(1); }, 500);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const handleView = (shop) => {
    setSelectedShop(shop);
    setShowDetailModal(true);
  };

  return (
    <div className="page-container">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Pre-Shops</h1>
            <span className="badge badge-info text-sm">{total} on trial</span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Shops currently on trial period. They will move to the main Shops page after payment.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/super-admin/shops" className="btn-secondary flex items-center gap-2">
            <FiShoppingBag className="w-4 h-4" />
            Active Shops
          </Link>
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

      {/* Filters */}
      <div className="card mb-6">
        <div className="card-body">
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search pre-shops by name, email, or phone..."
              className="input-field pl-9"
            />
          </div>
        </div>
      </div>

      {/* Trial Shops Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-900">
                <th className="table-header">Shop Name</th>
                <th className="table-header">Business Type</th>
                <th className="table-header">Email</th>
                <th className="table-header">Phone</th>
                <th className="table-header">City</th>
                <th className="table-header">Trial Ends</th>
                <th className="table-header">Days Left</th>
                <th className="table-header">Status</th>
                <th className="table-header">Payment</th>
                <th className="table-header text-right" style={{ minWidth: '200px' }}>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-gray-700">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className="table-cell"><div className="h-5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : shops.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-12">
                    <FiClock className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                    <p className="text-gray-400 dark:text-gray-500">No pre-shops found</p>
                    <p className="text-xs text-gray-400 mt-1">Pre-shops appear here when users sign up and start their trial.</p>
                  </td>
                </tr>
              ) : (
                shops.map((shop) => {
                  const trialEnds = shop.subscription?.trialEndsAt ? new Date(shop.subscription.trialEndsAt) : null;
                  const daysLeft = trialEnds ? Math.ceil((trialEnds - new Date()) / (1000 * 60 * 60 * 24)) : 0;
                  return (
                    <tr key={shop._id} className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${daysLeft <= 3 ? 'bg-danger-50/50 dark:bg-danger-900/10' : ''}`}>
                      <td className="table-cell">
                        <button onClick={() => handleView(shop)} className="font-medium text-primary-600 dark:text-primary-400 hover:underline text-left">
                          {shop.name}
                        </button>
                      </td>
                      <td className="table-cell text-xs text-gray-500">
                        {shop.businessType?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </td>
                      <td className="table-cell">{shop.contact?.email || '-'}</td>                      <td className="table-cell">{
                        shop.contact?.phone || '-'
                      }</td>
                      <td className="table-cell">{shop.address?.city || '-'}</td>
                      <td className="table-cell text-xs">
                        {trialEnds ? trialEnds.toLocaleDateString('en-IN') : '-'}
                      </td>
                      <td className="table-cell">
                        <span className={`badge ${daysLeft <= 3 ? 'badge-danger' : 'badge-info'}`}>
                          {daysLeft > 0 ? `${daysLeft}d` : 'Expired'}
                        </span>
                      </td>
                      <td className="table-cell">
                        <span className={`badge ${shop.subscription?.status === 'expired' ? 'badge-danger' : 'badge-info'}`}>
                          {shop.subscription?.status || 'trial'}
                        </span>
                      </td>
                      <td className="table-cell">
                        <span className="badge badge-warning flex items-center gap-1 w-fit">
                          <FiDollarSign className="w-3 h-3" />
                          Payment Needed
                        </span>
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
                            onClick={() => {
                              setExtendCustomDays(7);
                              setExtendingShop(extendingShop?._id === shop._id ? null : shop);
                            }}
                            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-green-500"
                            title="Extend Trial"
                          >
                            <FiPlusCircle className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setSetTrialDays(14);
                              setSettingTrialShop(settingTrialShop?._id === shop._id ? null : shop);
                            }}
                            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-amber-500"
                            title="Set Trial Days"
                          >
                            <FiEdit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleSendReminder(shop._id)}
                            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-blue-500"
                            title="Send Subscription Reminder"
                          >
                            <FiSend className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleAssignPlan(shop)}
                            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-violet-500"
                            title="Assign Plan & Collect Payment"
                          >
                            <FiCreditCard className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteShop(shop._id, shop.name)}
                            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-danger-400"
                            title="Delete Shop"
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
            <p className="text-sm text-gray-500 dark:text-gray-400">Page {page} of {totalPages}</p>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary p-2 disabled:opacity-50">
                <FiChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="btn-secondary p-2 disabled:opacity-50">
                <FiChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Extend Trial Inline Popover */}
      {extendingShop && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={() => setExtendingShop(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-5 min-w-[260px]" onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Extend Trial</h3>
            <p className="text-xs text-gray-500 mb-3">
              Extend trial for <strong>{extendingShop.name}</strong>
            </p>
            <div className="flex gap-1.5 mb-3">
              {[3, 7, 14, 30].map(d => (
                <button
                  key={d}
                  type="button"
                  onClick={() => {
                    handleQuickExtend(extendingShop._id, d);
                    setExtendingShop(null);
                  }}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-primary-50 hover:border-primary-300 hover:text-primary-700 dark:hover:bg-primary-900/20 transition-colors"
                >
                  +{d}d
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={extendCustomDays}
                onChange={e => setExtendCustomDays(parseInt(e.target.value) || 1)}
                className="input-field text-sm py-1.5 px-2 w-20"
                min={1}
                max={365}
              />
              <span className="text-xs text-gray-400">days</span>
              <div className="flex-1" />
              <button
                onClick={() => {
                  handleQuickExtend(extendingShop._id, extendCustomDays);
                  setExtendingShop(null);
                }}
                className="px-4 py-1.5 text-sm font-medium bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
              >
                Go
              </button>
              <button
                onClick={() => setExtendingShop(null)}
                className="px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-500 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Set Trial Days Popover */}
      {settingTrialShop && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={() => setSettingTrialShop(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-5 min-w-[280px]" onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Set Trial Days</h3>
            <p className="text-xs text-gray-500 mb-3">
              Set trial period for <strong>{settingTrialShop.name}</strong>
              {settingTrialShop.subscription?.trialEndsAt && (
                <> — currently ends {new Date(settingTrialShop.subscription.trialEndsAt).toLocaleDateString('en-IN')}</>
              )}
            </p>
            <p className="text-[10px] text-amber-600 dark:text-amber-400 mb-3 flex items-center gap-1">
              <FiAlertTriangle className="w-3 h-3" />
              This will override the trial end date and set it to N days from today
            </p>
            <div className="flex gap-1.5 mb-3">
              {[7, 14, 21, 30].map(d => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setSetTrialDays(d)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                    setTrialDays === d
                      ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-600 text-amber-700 dark:text-amber-300'
                      : 'border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  {d}d
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={setTrialDays}
                onChange={e => setSetTrialDays(parseInt(e.target.value) || 1)}
                className="input-field text-sm py-1.5 px-2 w-20"
                min={1}
                max={365}
              />
              <span className="text-xs text-gray-400">days from today</span>
              <div className="flex-1" />
              <button
                onClick={() => handleSetTrialDays(settingTrialShop._id, setTrialDays)}
                className="px-4 py-1.5 text-sm font-medium bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
              >
                Set
              </button>
              <button
                onClick={() => setSettingTrialShop(null)}
                className="px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-500 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Plan Modal */}
      {showAssignModal && (
        <AssignPlanModal
          shop={assignShop}
          plans={plans}
          onClose={() => { setShowAssignModal(false); setAssignShop(null); }}
          onSuccess={() => { setShowAssignModal(false); setAssignShop(null); loadShops(); }}
        />
      )}

      {/* Detail Modal */}
      {showDetailModal && (
        <PreShopDetailModal
          shop={selectedShop}
          onClose={() => { setShowDetailModal(false); setSelectedShop(null); }}
          onActivate={() => { setShowDetailModal(false); setSelectedShop(null); loadShops(); }}
          onRefresh={loadShops}
        />
      )}
    </div>
  );
}
