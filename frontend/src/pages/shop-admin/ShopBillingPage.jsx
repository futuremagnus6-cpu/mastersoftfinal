import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  FiCreditCard, FiClock, FiCheckCircle, FiAlertTriangle,
  FiRefreshCw, FiCalendar, FiDollarSign, FiArrowRight,
  FiShield, FiCpu, FiServer, FiUsers, FiPackage,
  FiHardDrive, FiLayers, FiGift, FiGlobe, FiBell,
  FiDownload, FiPrinter, FiSearch, FiChevronLeft, FiChevronRight,
  FiX, FiCheck, FiInfo,
} from 'react-icons/fi';
import { apiService } from '../../services/api';
import toast from 'react-hot-toast';
import config from '../../config';

// ─── Plan Card ───
function PlanCard({ plan, selected, onSelect, onSubscribe, processing, isCurrentPlan, hasActiveSub, currentDuration, periodEnd }) {
  const featureIcons = {
    pos: FiCpu, inventory: FiPackage, crm: FiUsers,
    suppliers: FiUsers, purchases: FiPackage, expenses: FiDollarSign,
    employees: FiUsers, multiBranch: FiLayers, loyalty: FiGift,
    ecommerce: FiGlobe, barcodeScanner: FiCpu, gstModule: FiShield,
    whatsappNotifications: FiBell, emailNotifications: FiBell,
    lowStockAlerts: FiBell, expiryAlerts: FiBell,
    autoBackup: FiServer, multiLanguage: FiGlobe,
  };

  const enabledFeatures = Object.entries(plan.features || {})
    .filter(([, v]) => v === true)
    .map(([k]) => k.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()));

  const p1 = plan.price1Month || plan.monthlyPrice;
  const p6 = plan.price6Months || Math.round(plan.monthlyPrice * 6 * 0.95);
  const p12 = plan.price12Months || Math.round(plan.monthlyPrice * 12 * 0.90);
  const s6 = plan.savings6Months || 5;
  const s12 = plan.savings12Months || 10;

  const buttonLabel = isCurrentPlan ? 'Extend Plan' : (hasActiveSub ? 'Buy Premium' : 'Buy Subscription');

  return (
    <motion.div
      whileHover={isCurrentPlan ? {} : { y: -4 }}
      className={`card p-6 ${isCurrentPlan ? '' : 'cursor-pointer'} border-2 transition-all ${
        isCurrentPlan
          ? 'border-success-500 bg-success-50/30 dark:bg-success-900/10'
          : selected
            ? 'border-primary-500 shadow-lg shadow-primary-500/10'
            : 'border-transparent hover:border-gray-300 dark:hover:border-gray-600'
      }`}
      onClick={() => !isCurrentPlan && onSelect(plan._id)}
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">{plan.name}</h3>
          <p className="text-sm text-gray-500">{plan.description || ''}</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-primary-600 dark:text-primary-400">₹{p1}</p>
          <p className="text-xs text-gray-400">/month</p>
        </div>
      </div>

      {/* Duration Pricing Tiers */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="text-center p-2 rounded-lg bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-700">
          <p className="text-sm font-bold text-gray-900 dark:text-white">₹{p1}</p>
          <p className="text-[10px] text-gray-400">1mo</p>
        </div>
        <div className="text-center p-2 rounded-lg bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-700 relative">
          <span className="absolute -top-2 -right-1 text-[8px] font-bold px-1 py-0.5 rounded-full bg-primary-600 text-white">Save {s6}%</span>
          <p className="text-sm font-bold text-gray-900 dark:text-white">₹{p6.toLocaleString('en-IN')}</p>
          <p className="text-[10px] text-gray-400">6mo</p>
        </div>
        <div className="text-center p-2 rounded-lg bg-success-50 dark:bg-success-900/20 border border-success-200 dark:border-success-800 relative">
          <span className="absolute -top-2 -right-1 text-[8px] font-bold px-1 py-0.5 rounded-full bg-success-600 text-white">Save {s12}%</span>
          <p className="text-sm font-bold text-success-700 dark:text-success-300">₹{p12.toLocaleString('en-IN')}</p>
          <p className="text-[10px] text-success-500">12mo</p>
        </div>
      </div>

      {/* Limits */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <FiUsers className="w-4 h-4" /> {plan.limits?.maxUsers || '-'} Users
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <FiPackage className="w-4 h-4" /> {plan.limits?.maxProducts || '-'} Products
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <FiLayers className="w-4 h-4" /> {plan.limits?.maxBranches || '-'} Branches
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <FiHardDrive className="w-4 h-4" /> {plan.limits?.maxStorage || '-'} GB Storage
        </div>
      </div>

      {/* Trial Period */}
      {plan.trialPeriod > 0 && !isCurrentPlan && (
        <div className="flex items-center gap-1 text-xs text-info-500 mb-3">
          <FiClock className="w-3 h-3" />
          {plan.trialPeriod}-day free trial
        </div>
      )}

      {/* Features */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {enabledFeatures.slice(0, 6).map((feat) => (
          <span key={feat} className="text-xs px-2 py-0.5 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 rounded-full">
            {feat}
          </span>
        ))}
        {enabledFeatures.length > 6 && (
          <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-500 rounded-full">
            +{enabledFeatures.length - 6} more
          </span>
        )}
      </div>

      {/* Current Plan badge + Buy/Premium button */}
      <div className="space-y-2">
        {isCurrentPlan && (
          <>
            <div className="w-full py-2 rounded-lg font-medium text-xs flex items-center justify-center gap-1 bg-success-100 dark:bg-success-900/30 text-success-700 dark:text-success-300 border border-success-300 dark:border-success-700">
              <FiCheckCircle className="w-3 h-3" /> Current Plan
              {currentDuration && (
                <span className="text-[10px] opacity-75">— {currentDuration} Month{currentDuration > 1 ? 's' : ''}</span>
              )}
            </div>
            {periodEnd && (
              <div className="flex items-center justify-center gap-1.5 text-[10px] text-gray-500 dark:text-gray-400 py-1.5 px-2 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-100 dark:border-gray-700">
                <FiCalendar className="w-3 h-3" />
                Valid until {new Date(periodEnd).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </div>
            )}
          </>
        )}
        {buttonLabel && (
          <button
            type="button"
            disabled={processing}
            onClick={(e) => { e.stopPropagation(); onSubscribe(plan); }}
            className={`w-full py-2.5 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2 ${
              isCurrentPlan
                ? 'bg-primary-600 hover:bg-primary-700 text-white shadow-lg shadow-primary-500/25'
                : selected
                  ? 'bg-primary-600 hover:bg-primary-700 text-white shadow-lg shadow-primary-500/25'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {processing ? (
              <><FiRefreshCw className="w-4 h-4 animate-spin" /> Processing...</>
            ) : hasActiveSub ? (
              <><FiArrowRight className="w-4 h-4" /> {buttonLabel}</>
            ) : (
              <><FiCreditCard className="w-4 h-4" /> {buttonLabel}</>
            )}
          </button>
        )}
      </div>
    </motion.div>
  );
}

// ─── Receipt Print Component ───
const PaymentReceipt = React.forwardRef(({ transaction, shopName }, ref) => (
  <div ref={ref} className="p-8 bg-white text-black" style={{ fontFamily: 'Courier New, monospace', maxWidth: '400px', margin: '0 auto' }}>
    <div className="text-center border-b-2 border-dashed border-gray-300 pb-4 mb-4">
      <h2 className="text-lg font-bold uppercase">{shopName || 'Magnus OS'}</h2>
      <p className="text-xs text-gray-600">Payment Receipt</p>
    </div>
    <div className="space-y-2 text-sm">
      <div className="flex justify-between">
        <span className="text-gray-600">Receipt #:</span>
        <span className="font-bold">{transaction?.paymentId?.slice(-12) || 'N/A'}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-gray-600">Date:</span>
        <span>{transaction?.paidAt ? new Date(transaction.paidAt).toLocaleString('en-IN') : 'N/A'}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-gray-600">Plan:</span>
        <span>{transaction?.planName || 'Subscription'}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-gray-600">Paid By:</span>
        <span>{transaction?.paidBy || 'Admin'}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-gray-600">Payment ID:</span>
        <span className="text-xs">{transaction?.paymentId || '-'}</span>
      </div>
      <div className="border-t-2 border-dashed border-gray-300 pt-3 mt-3">
        <div className="flex justify-between text-base">
          <span className="font-bold">Amount Paid:</span>
          <span className="font-bold text-lg">₹{transaction?.amount || 0}</span>
        </div>
      </div>
    </div>
    <div className="border-t-2 border-dashed border-gray-300 mt-6 pt-4 text-center text-xs text-gray-500">
      <p>Thank you for your payment!</p>
      <p className="mt-1">Generated by Future Magnus Business OS</p>
    </div>
  </div>
));

// ─── Payment Confirmation Modal ───
function PaymentConfirmModal({ plan, onConfirm, onClose, processing, isExtension }) {
  if (!plan) return null;

  const [selectedDuration, setSelectedDuration] = React.useState(1);

  const enabledFeatures = Object.entries(plan.features || {})
    .filter(([, v]) => v === true)
    .map(([k]) => k.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()));

  const p1 = plan.price1Month || plan.monthlyPrice;
  const p6 = plan.price6Months || Math.round(plan.monthlyPrice * 6 * 0.95);
  const p12 = plan.price12Months || Math.round(plan.monthlyPrice * 12 * 0.90);
  const s6 = plan.savings6Months || 5;
  const s12 = plan.savings12Months || 10;

  const durationOptions = [
    { value: 1, label: '1 Month', price: p1, savings: 0, badge: null },
    { value: 6, label: '6 Months', price: p6, savings: s6, badge: 'Popular' },
    { value: 12, label: '12 Months', price: p12, savings: s12, badge: 'Best Value' },
  ];

  const selected = durationOptions.find(d => d.value === selectedDuration);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
              <FiCreditCard className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">{isExtension ? 'Extend Plan' : 'Confirm Subscription'}</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">{plan.name} — {isExtension ? 'Add more months' : 'Choose duration'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 transition-colors">
            <FiX className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Duration Selector */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Select Duration</p>
            <div className="grid grid-cols-3 gap-2">
              {durationOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setSelectedDuration(opt.value)}
                  className={`relative p-2 rounded-xl border-2 text-center transition-all ${
                    selectedDuration === opt.value
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 shadow-md shadow-primary-500/10'
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 bg-white dark:bg-gray-800'
                  }`}
                >
                  {opt.badge && (
                    <span className={`absolute -top-2 left-1/2 -translate-x-1/2 text-[8px] font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap ${
                      opt.value === 6
                        ? 'bg-primary-600 text-white'
                        : 'bg-success-600 text-white'
                    }`}>
                      {opt.badge}
                    </span>
                  )}
                  <p className={`text-sm font-bold ${
                    selectedDuration === opt.value ? 'text-primary-700 dark:text-primary-300' : 'text-gray-900 dark:text-white'
                  }`}>
                    ₹{opt.price.toLocaleString('en-IN')}
                  </p>
                  <p className={`text-[10px] mt-0.5 ${
                    selectedDuration === opt.value ? 'text-primary-600 dark:text-primary-400' : 'text-gray-500 dark:text-gray-400'
                  }`}>
                    {opt.label}
                  </p>
                  {opt.savings > 0 && (
                    <p className="text-[9px] font-medium text-success-600 dark:text-success-400 mt-0.5">
                      Save {opt.savings}%
                    </p>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Plan Summary */}
          <div className="flex items-center justify-between p-4 bg-primary-50 dark:bg-primary-900/20 rounded-xl border border-primary-100 dark:border-primary-800">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{plan.name}</p>
              <p className="text-xs text-gray-400">{selected?.label}{isExtension ? ' extension' : ' subscription'}</p>
            </div>
            <div className="text-right">
              <p className="text-xl font-bold text-primary-600 dark:text-primary-400">₹{(selected?.price || p1).toLocaleString('en-IN')}</p>
              <p className="text-xs text-gray-400">{selected?.label === '1 Month' ? '/month' : `for ${selected?.label}`}</p>
            </div>
          </div>

          {/* Limits */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Plan Limits</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 p-2 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                <FiUsers className="w-4 h-4 text-gray-400" /> {plan.limits?.maxUsers || '-'} Users
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 p-2 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                <FiPackage className="w-4 h-4 text-gray-400" /> {plan.limits?.maxProducts || '-'} Products
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 p-2 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                <FiLayers className="w-4 h-4 text-gray-400" /> {plan.limits?.maxBranches || '-'} Branches
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 p-2 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                <FiHardDrive className="w-4 h-4 text-gray-400" /> {plan.limits?.maxStorage || '-'} GB
              </div>
            </div>
          </div>

          {/* Features */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Included Features</p>
            <div className="flex flex-wrap gap-1.5">
              {enabledFeatures.length > 0 ? (
                enabledFeatures.map((feat) => (
                  <span key={feat} className="flex items-center gap-1 text-xs px-2.5 py-1 bg-success-50 dark:bg-success-900/20 text-success-700 dark:text-success-300 rounded-full">
                    <FiCheck className="w-3 h-3" />
                    {feat}
                  </span>
                ))
              ) : (
                <span className="text-xs text-gray-400">No specific features listed</span>
              )}
            </div>
          </div>

          {/* Tax Info */}
          <div className="flex items-start gap-2 p-3 bg-warning-50 dark:bg-warning-900/20 rounded-lg border border-warning-100 dark:border-warning-800">
            <FiInfo className="w-4 h-4 text-warning-500 mt-0.5 shrink-0" />
            <p className="text-xs text-warning-700 dark:text-warning-300">
              GST and applicable taxes will be added at checkout. By confirming, you agree to the terms of service and subscription auto-renewal policy.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 p-5 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
          <button
            onClick={onClose}
            disabled={processing}
            className="btn-secondary flex-1 py-2.5 text-sm"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(plan, selectedDuration)}
            disabled={processing}
            className="btn-primary flex-1 py-2.5 text-sm flex items-center justify-center gap-2"
          >
            {processing ? (
              <><FiRefreshCw className="w-4 h-4 animate-spin" /> Processing...</>
            ) : (
              <><FiCheck className="w-4 h-4" /> Pay ₹{(selected?.price || p1).toLocaleString('en-IN')}</>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Main Billing Page ───
export default function ShopBillingPage() {
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState(null);
  const [availablePlans, setAvailablePlans] = useState([]);
  const [selectedPlanId, setSelectedPlanId] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [shopInfo, setShopInfo] = useState({ name: '', email: '' });
  const [transactions, setTransactions] = useState([]);
  const [txnLoading, setTxnLoading] = useState(false);
  const [txnPage, setTxnPage] = useState(1);
  const [txnTotal, setTxnTotal] = useState(0);
  const [txnPages, setTxnPages] = useState(0);
  const [receiptData, setReceiptData] = useState(null);
  const [confirmPlan, setConfirmPlan] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isExtension, setIsExtension] = useState(false);
  const receiptRef = useRef(null);

  const loadSubscription = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiService.getSubscriptionBilling();
      const data = res.data?.data;
      setSubscription(data?.subscription);
      setAvailablePlans(data?.availablePlans || []);
      setShopInfo({ name: data?.shopName || '', email: data?.shopEmail || '' });
      if (data?.availablePlans?.length > 0) {
        // Pre-select a non-current plan, or first plan
        const currentPlanId = String(data?.subscription?.plan?._id || data?.subscription?.plan || '');
        const nonCurrentPlan = data.availablePlans.find(p => String(p._id) !== currentPlanId);
        setSelectedPlanId(nonCurrentPlan?._id || data.availablePlans[0]._id);
      }
    } catch (err) {
      // If the endpoint doesn't exist yet, show empty state
      console.error('Failed to load billing:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadTransactions = useCallback(async (page = 1) => {
    setTxnLoading(true);
    try {
      const res = await apiService.get('/payments/transactions', { params: { page, limit: 10 } });
      const data = res.data?.data;
      setTransactions(data?.transactions || []);
      setTxnTotal(data?.pagination?.total || 0);
      setTxnPages(data?.pagination?.pages || 0);
      setTxnPage(page);
    } catch (err) {
      console.error('Failed to load transactions:', err);
      setTransactions([]);
    } finally {
      setTxnLoading(false);
    }
  }, []);

  useEffect(() => { loadSubscription(); }, [loadSubscription]);
  useEffect(() => {
    if (!loading) loadTransactions(1);
  }, [loading, loadTransactions]);

  const currentPlanId = String(subscription?.plan?._id || subscription?.plan || '');

  const isTrial = subscription?.status === 'trial';
  const trialEnds = subscription?.trialEndsAt ? new Date(subscription.trialEndsAt) : null;
  const daysLeft = trialEnds ? Math.ceil((trialEnds - new Date()) / (1000 * 60 * 60 * 24)) : 0;
  const isTrialExpired = daysLeft <= 0 && isTrial;
  const isSubExpired = subscription?.status === 'expired';
  const isExpired = isTrialExpired || isSubExpired;
  const isActive = subscription?.status === 'active';

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) { resolve(true); return; }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  // Show confirmation modal before processing payment
  const handleSubscribe = (plan) => {
    const isExt = String(plan._id) === currentPlanId;
    setIsExtension(isExt);
    setConfirmPlan(plan);
    setShowConfirmModal(true);
  };

  // Actual payment processing after confirmation
  const processPayment = async (plan, duration) => {
    const selectedMonths = duration || 1;
    const isExt = String(plan._id) === currentPlanId;
    setShowConfirmModal(false);
    setProcessing(true);
    try {
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        toast.error('Failed to load payment gateway. Please try again.');
        setProcessing(false);
        return;
      }

      // Create Razorpay order with duration — use extend endpoint for current plan
      const orderRes = isExt
        ? await apiService.extendPayment({ planId: plan._id, duration: selectedMonths })
        : await apiService.createPaymentOrder({ planId: plan._id, duration: selectedMonths });
      const orderData = orderRes.data?.data;

      if (!orderData?.orderId) {
        toast.error('Failed to create payment order');
        setProcessing(false);
        return;
      }

      // Open Razorpay Checkout
      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'Magnus OS',
        description: `${orderData.planName} - ₹${orderData.planPrice}/month`,
        image: '',
        order_id: orderData.orderId,
        prefill: {
          name: shopInfo.name,
          email: shopInfo.email,
          contact: '',
        },
        theme: {
          color: '#2563eb',
        },
        handler: async function (response) {
          try {
            const verifyRes = await apiService.verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });

            if (verifyRes.data?.success) {
              toast.success(isExt ? 'Plan extended successfully!' : 'Payment successful! Your subscription is now active.');
              loadSubscription();
            }
          } catch (err) {
            toast.error('Payment verification failed. Please contact support.');
          }
        },
        modal: {
          ondismiss: function () {
            toast('Payment cancelled', { icon: '❌' });
            setProcessing(false);
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (response) {
        toast.error(`Payment failed: ${response.error.description}`);
        setProcessing(false);
      });
      rzp.open();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Payment processing failed');
      setProcessing(false);
    }
  };

  const handlePrintReceipt = (txn) => {
    setReceiptData(txn);
    setTimeout(() => {
      const printContent = receiptRef.current;
      if (printContent) {
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
          <html>
            <head>
              <title>Payment Receipt</title>
              <style>
                body { margin: 0; padding: 20px; font-family: 'Courier New', monospace; }
                @media print {
                  body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                }
              </style>
            </head>
            <body>${printContent.outerHTML}</body>
          </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => { printWindow.print(); }, 300);
      }
    }, 100);
  };

  // Loading state
  if (loading) {
    return (
      <div className="page-container">
        <div className="page-header">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Billing & Subscription</h1>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card p-6">
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-2/3 mb-4 animate-pulse" />
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 animate-pulse" />
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Billing & Subscription</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage your subscription plan and payments
          </p>
        </div>
      </div>

      {/* Current Subscription Status */}
      <div className="card mb-6">
        <div className="card-body">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${
                isExpired ? 'bg-danger-100 dark:bg-danger-900/30' :
                isTrial ? 'bg-info-100 dark:bg-info-900/30' :
                'bg-success-100 dark:bg-success-900/30'
              }`}>
                {isExpired ? (
                  <FiAlertTriangle className="w-7 h-7 text-danger-500" />
                ) : isTrial ? (
                  <FiClock className="w-7 h-7 text-info-500" />
                ) : (
                  <FiCheckCircle className="w-7 h-7 text-success-500" />
                )}
              </div>
              <div>
                <p className="text-lg font-bold text-gray-900 dark:text-white">
                  {isExpired ? 'Trial Expired' : isTrial ? 'Trial Period' : 'Subscription Active'}
                  {isActive && subscription?.plan?.name && (
                    <span className="text-sm font-normal text-gray-500 dark:text-gray-400 ml-2">
                      — {subscription.plan.name} ({subscription.durationMonths || 1} Month{subscription.durationMonths !== 1 ? 's' : ''})
                    </span>
                  )}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {isExpired ? (
                    'Your trial has ended. Please subscribe to continue using Magnus OS.'
                  ) : isTrial ? (
                    trialEnds ? (
                      <>
                        <FiCalendar className="w-3.5 h-3.5 inline mr-1 text-gray-400" />
                        Trial ends on {trialEnds.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })} — {daysLeft} day{daysLeft !== 1 ? 's' : ''} remaining
                      </>
                    ) : 'Free trial in progress'
                  ) : subscription?.currentPeriodEnd ? (
                    <>
                      <FiCalendar className="w-3.5 h-3.5 inline mr-1 text-gray-400" />
                      Renews on {new Date(subscription.currentPeriodEnd).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </>
                  ) : 'Payment confirmed'
                  }
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isTrial && (
                <span className="badge badge-info text-sm px-3 py-1">{daysLeft} days left</span>
              )}
              {subscription?.status && (
                <span className={`badge ${
                  subscription.status === 'active' ? 'badge-success' :
                  subscription.status === 'trial' ? 'badge-info' :
                  'badge-danger'
                }`}>{subscription.status}</span>
              )}
            </div>
          </div>

          {/* Trial Expired Warning */}
          {isExpired && (
            <div className="mt-4 p-4 bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800 rounded-lg">
              <div className="flex items-center gap-2 text-danger-700 dark:text-danger-300 mb-1">
                <FiAlertTriangle className="w-4 h-4" />
                <span className="text-sm font-medium">Trial has expired</span>
              </div>
              <p className="text-xs text-danger-600 dark:text-danger-400">
                Your free trial has ended. Some features may be limited until you subscribe to a plan.
                Choose a plan below to continue using all features.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Payment Prompt for Trial/Expired Shops */}
      {(isTrial || isExpired) && (
        <div className="card mb-6 border-2 border-warning-400 dark:border-warning-600 bg-gradient-to-r from-warning-50 to-orange-50 dark:from-warning-900/20 dark:to-orange-900/20">
          <div className="card-body flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-xl bg-warning-100 dark:bg-warning-900/30 flex items-center justify-center shrink-0">
                <FiDollarSign className="w-6 h-6 text-warning-600 dark:text-warning-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">
                  {isExpired ? 'Subscription Required' : 'Complete Your Payment'}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {isExpired
                    ? 'Your trial has ended. Choose a plan below and complete payment to continue using all features.'
                    : 'Select a plan below to activate your subscription and unlock all features. Your data is safe and will be preserved.'
                  }
                </p>
              </div>
            </div>
            <span className="badge badge-warning text-sm px-3 py-1.5 whitespace-nowrap">
              {isExpired ? 'Action Required' : 'Payment Pending'}
            </span>
          </div>
        </div>
      )}

      {/* Available Plans */}
      {availablePlans.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {isTrial || isExpired ? 'Choose a Plan & Subscribe' : 'Available Plans'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {availablePlans.map((plan) => (
              <PlanCard
                key={plan._id}
                plan={plan}
                isCurrentPlan={currentPlanId === String(plan._id)}
                hasActiveSub={isActive}
                currentDuration={subscription?.durationMonths}
                periodEnd={subscription?.currentPeriodEnd}
                selected={String(selectedPlanId) === String(plan._id)}
                onSelect={setSelectedPlanId}
                onSubscribe={handleSubscribe}
                processing={processing}
              />
            ))}
          </div>
        </div>
      )}

      {/* No Plans Available */}
      {availablePlans.length === 0 && (
        <div className="card p-12 text-center">
          <FiCreditCard className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Plans Available</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Subscription plans have not been configured yet. Please contact the administrator.
          </p>
          <div className="inline-flex items-center gap-2 text-sm text-primary-600 dark:text-primary-400">
            <FiMail className="w-4 h-4" />
            Contact Administrator
          </div>
        </div>
      )}

      {/* ─── Transaction History ─── */}
      <div className="card">
        <div className="card-header flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">
            Transaction History
            {txnTotal > 0 && <span className="text-sm font-normal text-gray-400 ml-2">({txnTotal})</span>}
          </h3>
          {txnTotal > 0 && (
            <button
              onClick={() => loadTransactions(1)}
              disabled={txnLoading}
              className="btn-secondary text-xs flex items-center gap-1 px-3 py-1.5"
            >
              <FiRefreshCw className={`w-3.5 h-3.5 ${txnLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          )}
        </div>
        <div className="card-body">
          {txnLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-12 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />
              ))}
            </div>
          ) : transactions.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b dark:border-gray-700 text-left text-xs text-gray-500 uppercase tracking-wider">
                      <th className="pb-2 pr-2">Date</th>
                      <th className="pb-2 pr-2">Plan</th>
                      <th className="pb-2 pr-2">Amount</th>
                      <th className="pb-2 pr-2">Payment ID</th>
                      <th className="pb-2 pr-2">Status</th>
                      <th className="pb-2 text-right">Receipt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y dark:divide-gray-700">
                    {transactions.map((txn) => (
                      <tr key={txn._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="py-3 pr-2 text-xs whitespace-nowrap">
                          {new Date(txn.paidAt).toLocaleDateString('en-IN', {
                            day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                          })}
                        </td>
                        <td className="py-3 pr-2 font-medium">{txn.planName}</td>
                        <td className="py-3 pr-2 font-semibold text-primary-600">₹{txn.amount}</td>
                        <td className="py-3 pr-2">
                          <span className="text-xs font-mono text-gray-500">
                            {txn.paymentId ? txn.paymentId.slice(-12) : '-'}
                          </span>
                        </td>
                        <td className="py-3 pr-2">
                          <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
                            txn.status === 'success'
                              ? 'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-300'
                              : 'bg-danger-100 text-danger-700 dark:bg-danger-900/30 dark:text-danger-300'
                          }`}>
                            <FiCheckCircle className="w-3 h-3" />
                            {txn.status}
                          </span>
                        </td>
                        <td className="py-3 text-right">
                          <button
                            onClick={() => handlePrintReceipt(txn)}
                            className="btn-secondary text-xs flex items-center gap-1 px-2.5 py-1.5 ml-auto"
                          >
                            <FiPrinter className="w-3.5 h-3.5" />
                            Print
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {txnPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t dark:border-gray-700 mt-4">
                  <span className="text-xs text-gray-500">
                    Page {txnPage} of {txnPages}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => loadTransactions(txnPage - 1)}
                      disabled={txnPage <= 1}
                      className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-40"
                    >
                      <FiChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => loadTransactions(txnPage + 1)}
                      disabled={txnPage >= txnPages}
                      className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-40"
                    >
                      <FiChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <FiSearch className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No payment transactions yet</p>
              <p className="text-xs mt-1">Payments will appear here once you subscribe to a plan</p>
            </div>
          )}
        </div>
      </div>

      {/* Hidden receipt for printing */}
      <div className="hidden">
        <PaymentReceipt ref={receiptRef} transaction={receiptData} shopName={shopInfo.name} />
      </div>

      {/* Payment Confirmation Modal */}
      {showConfirmModal && (
        <PaymentConfirmModal
          plan={confirmPlan}
          isExtension={isExtension}
          onConfirm={(plan, duration) => processPayment(plan, duration)}
          onClose={() => { setShowConfirmModal(false); setConfirmPlan(null); setIsExtension(false); }}
          processing={processing}
        />
      )}
    </div>
  );
}
