import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiSearch, FiPlus, FiMinus, FiTrash2, FiX, FiUser,
  FiShoppingCart, FiDollarSign, FiSmartphone, FiCreditCard,
  FiPrinter, FiCheck, FiPercent, FiCamera, FiHash,
  FiRefreshCw, FiArrowLeft, FiGrid, FiList, FiPackage,
  FiUsers, FiCalendar, FiEdit2, FiAlertCircle,
} from 'react-icons/fi';
import { apiService } from '../../services/api';
import toast from 'react-hot-toast';
import { getMainImageUrl } from '../../utils/assets';

// ─── Constants ───
const GST_RATES = [0, 5, 12, 18, 28];
const PAYMENT_METHODS = [
  { id: 'cash', label: 'Cash', icon: FiDollarSign, color: 'bg-success-500' },
  { id: 'upi', label: 'Online', icon: FiSmartphone, color: 'bg-primary-500' },
  { id: 'card', label: 'Card', icon: FiCreditCard, color: 'bg-warning-500' },
  { id: 'company', label: 'Company', icon: FiUsers, color: 'bg-violet-500' },
];

const ONLINE_METHODS = ['UPI', 'Net Banking', 'Wallet', 'QR Code'];
const CARD_METHODS = ['Credit Card', 'Debit Card', 'Amex'];

// ─── Cart Item Component ───
function CartItemRow({ item, onUpdateQty, onRemove, onDiscount }) {
  return (
    <div className="flex items-start gap-3 p-3 border-b dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group">
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{item.productName}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-gray-500">₹{item.sellingPrice.toFixed(2)}</span>
              <span className="text-xs text-gray-400">|</span>
              <span className="text-xs text-gray-500">GST: {item.gstRate}%</span>
              {item.hsnCode && (
                <>
                  <span className="text-xs text-gray-400">|</span>
                  <span className="text-xs text-gray-500">HSN: {item.hsnCode}</span>
                </>
              )}
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold text-gray-900 dark:text-white">₹{item.total.toFixed(2)}</p>
            {item.discountPercent > 0 && (
              <p className="text-xs text-success-600">-{item.discountPercent}% off</p>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 mt-2">
          {/* Qty Controls */}
          <div className="flex items-center border dark:border-gray-600 rounded-lg">
            <button
              onClick={() => onUpdateQty(item._id || item.product, Math.max(0, item.quantity - 1))}
              disabled={item.quantity <= 1}
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 disabled:opacity-30"
            >
              <FiMinus className="w-3 h-3" />
            </button>
            <span className="px-3 text-sm font-medium text-gray-900 dark:text-white min-w-[2rem] text-center">
              {item.quantity}
            </span>
            <button
              onClick={() => onUpdateQty(item._id || item.product, item.quantity + 1)}
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"
            >
              <FiPlus className="w-3 h-3" />
            </button>
          </div>

          {/* Discount */}
          <button
            onClick={() => onDiscount(item._id || item.product)}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400"
            title="Set discount"
          >
            <FiPercent className="w-3.5 h-3.5" />
          </button>

          {/* Remove */}
          <button
            onClick={() => onRemove(item._id || item.product)}
            className="p-1.5 rounded-lg hover:bg-danger-50 dark:hover:bg-danger-900/20 text-gray-400 hover:text-danger-500 ml-auto opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <FiTrash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Product Card (grid view) ───
function ProductCard({ product, onAdd }) {
  const stockStatus = product.inventory?.quantity <= 0 ? 'out' :
    product.inventory?.quantity <= product.inventory?.minStockLevel ? 'low' : 'in';
  const imageUrl = getMainImageUrl(product.images);

  const statusColors = { in: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', low: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', out: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' };

  return (
    <button
      onClick={() => onAdd(product)}
      disabled={product.inventory?.quantity <= 0}
      className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-3 text-left hover:shadow-md hover:border-primary-300 dark:hover:border-primary-600 transition-all group disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none"
    >
      <div className="w-full aspect-square bg-gray-100 dark:bg-gray-700 rounded-lg mb-2 flex items-center justify-center">
        {imageUrl ? (
          <img src={imageUrl} alt={product.name} className="w-full h-full object-cover rounded-lg" />
        ) : (
          <FiPackage className="w-8 h-8 text-gray-300 dark:text-gray-600" />
        )}
      </div>

      <p className="text-xs font-medium text-gray-900 dark:text-white truncate">{product.name}</p>
      <p className="text-sm font-bold text-primary-600 dark:text-primary-400 mt-0.5">₹{product.pricing?.sellingPrice?.toFixed(2)}</p>

      <div className="flex items-center justify-between mt-1.5">
        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${statusColors[stockStatus]}`}>
          {stockStatus === 'in' ? `${product.inventory?.quantity} in stock` :
           stockStatus === 'low' ? `${product.inventory?.quantity} low` : 'Out of stock'}
        </span>
        <span className="text-[10px] text-gray-400">{product.pricing?.gstRate}% GST</span>
      </div>
    </button>
  );
}

// ─── GST Breakup Component ───
function GstBreakup({ items }) {
  const gstSummary = {};
  items.forEach(item => {
    const rate = item.gstRate || 0;
    if (!gstSummary[rate]) gstSummary[rate] = { rate, taxable: 0, cgst: 0, sgst: 0 };
    gstSummary[rate].taxable += item.taxableAmount || 0;
    gstSummary[rate].cgst += (item.gstAmount || 0) / 2;
    gstSummary[rate].sgst += (item.gstAmount || 0) / 2;
  });

  return (
    <div className="text-xs space-y-1">
      {Object.values(gstSummary).map((g) => (
        <div key={g.rate} className="flex justify-between text-gray-500 dark:text-gray-400">
          <span>GST {g.rate}%</span>
          <span>₹{g.taxable.toFixed(2)} · CGST: ₹{g.cgst.toFixed(2)} · SGST: ₹{g.sgst.toFixed(2)}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Payment Modal ───
function PaymentModal({ isOpen, onClose, onConfirm, total, balanceDue }) {
  const [payments, setPayments] = useState([{ method: 'cash', amount: total }]);
  const [method, setMethod] = useState('cash');
  const [customAmount, setCustomAmount] = useState(total);
  // Payment-specific fields
  const [transactionMethod, setTransactionMethod] = useState('UPI');
  const [transactionId, setTransactionId] = useState('');
  const [companyOrderNumber, setCompanyOrderNumber] = useState('');
  const [companyOrderDate, setCompanyOrderDate] = useState('');
  const [companyNote, setCompanyNote] = useState('');

  useEffect(() => {
    if (isOpen) {
      setPayments([{ method: 'cash', amount: total }]);
      setMethod('cash');
      setCustomAmount(total);
      setTransactionMethod('UPI');
      setTransactionId('');
      setCompanyOrderNumber('');
      setCompanyOrderDate('');
      setCompanyNote('');
    }
  }, [isOpen, total]);

  const paidTotal = payments.reduce((s, p) => s + p.amount, 0);
  const remaining = Math.max(0, total - paidTotal);

  const addPayment = () => {
    const amount = parseFloat(customAmount);
    if (!amount || amount <= 0) { toast.error('Enter a valid amount'); return; }
    if (amount > remaining + 0.01) { toast.error(`Maximum remaining: ₹${remaining.toFixed(2)}`); return; }
    
    const payment = { method, amount };                if (method === 'upi') {
      payment.transactionMethod = transactionMethod;
      payment.transactionId = transactionId;
      if (!transactionId) { toast.error('Transaction ID is required'); return; }
    }
    if (method === 'card') {
      payment.transactionMethod = transactionMethod;
      payment.transactionId = transactionId;
      if (!transactionId) { toast.error('Transaction ID is required'); return; }
    }
    if (method === 'company') {
      payment.companyOrderNumber = companyOrderNumber;
      payment.companyOrderDate = companyOrderDate || new Date().toISOString().split('T')[0];
      payment.companyNote = companyNote;
      if (!companyOrderNumber) { toast.error('Company order number is required'); return; }
    }

    setPayments([...payments, payment]);
    setCustomAmount(Math.max(0, remaining - amount));
    setTransactionId('');
    setCompanyOrderNumber('');
    setCompanyNote('');
    
    if (remaining - amount <= 0.01) setCustomAmount(0);
  };

  const removePayment = (index) => {
    if (payments.length <= 1) return;
    setPayments(payments.filter((_, i) => i !== index));
  };

  const updatePaymentAmount = (index, newAmount) => {
    const updated = [...payments];
    updated[index].amount = parseFloat(newAmount) || 0;
    setPayments(updated);
  };

  const validateAndConfirm = () => {
    // Validate each payment entry has required fields
    for (let i = 0; i < payments.length; i++) {
      const p = payments[i];
      if (p.amount <= 0) {
        toast.error(`Payment #${i + 1}: Enter a valid amount`);
        return;
      }
      if (p.method === 'upi' && !p.transactionId?.trim()) {
        toast.error(`UPI Payment #${i + 1}: Reference number / transaction ID is required`);
        return;
      }
      if (p.method === 'card' && !p.transactionId?.trim()) {
        toast.error(`Card Payment #${i + 1}: Transaction ID is required`);
        return;
      }
      if (p.method === 'company' && !p.companyOrderNumber?.trim()) {
        toast.error(`Company Payment #${i + 1}: Company order number is required`);
        return;
      }
    }
    onConfirm(payments);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content max-w-lg" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            <FiDollarSign className="w-5 h-5 inline mr-2 text-primary-500" />
            Payment
          </h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
            <FiX className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className="text-center border-b dark:border-gray-700 pb-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Amount</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">₹{total.toFixed(2)}</p>
            {remaining > 0.01 ? (
              <p className="text-sm text-warning-600 mt-1">Remaining: ₹{remaining.toFixed(2)}</p>
            ) : (
              <p className="text-sm text-success-600 mt-1">Fully paid ✓</p>
            )}
          </div>

          {/* Payment Entries */}
          {payments.map((p, i) => (
            <div key={i} className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium capitalize text-gray-900 dark:text-white flex items-center gap-1">
                  <span className={`w-2 h-2 rounded-full ${
                    p.method === 'cash' ? 'bg-green-500' :
                    p.method === 'upi' ? 'bg-blue-500' :
                    p.method === 'card' ? 'bg-yellow-500' :
                    'bg-violet-500'
                  }`} />
                  {p.method}
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={p.amount}
                    onChange={(e) => updatePaymentAmount(i, e.target.value)}
                    className="input-field w-28 text-sm text-right font-bold py-1"
                    min={0}
                    step="0.01"
                  />
                  {payments.length > 1 && (
                    <button onClick={() => removePayment(i)} className="text-danger-400 hover:text-danger-600">
                      <FiX className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
              {p.method === 'upi' && p.transactionId && (
                <p className="text-xs text-gray-500">
                  {p.transactionMethod}: {p.transactionId}
                </p>
              )}
              {p.method === 'card' && p.transactionId && (
                <p className="text-xs text-gray-500">
                  {p.transactionMethod}: {p.transactionId}
                </p>
              )}
              {p.method === 'company' && p.companyOrderNumber && (
                <p className="text-xs text-gray-500">
                  Order: {p.companyOrderNumber} | {p.companyOrderDate}
                  {p.companyNote && ` | ${p.companyNote}`}
                </p>
              )}
            </div>
          ))}

          {remaining > 0.01 && (
            <>
              {/* Method Selection */}
              <div className="grid grid-cols-4 gap-2">
                {PAYMENT_METHODS.map((pm) => (
                  <button
                    key={pm.id}
                    onClick={() => { setMethod(pm.id); setTransactionId(''); setCompanyOrderNumber(''); }}
                    className={`flex flex-col items-center gap-1 p-2 rounded-lg border text-xs transition-all ${
                      method === pm.id
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400'
                        : 'border-gray-200 dark:border-gray-600 text-gray-500 hover:border-gray-300'
                    }`}
                  >
                    <pm.icon className="w-4 h-4" />
                    <span>{pm.label}</span>
                  </button>
                ))}
              </div>

              {/* Payment-specific fields */}
              <div className="space-y-2 p-3 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800">
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="block text-xs text-gray-500 mb-1">Amount</label>
                    <input
                      type="number"
                      value={customAmount}
                      onChange={(e) => setCustomAmount(parseFloat(e.target.value) || 0)}
                      placeholder="Amount"
                      className="input-field text-sm"
                      min={0}
                      step="0.01"
                    />
                  </div>
                  {method === 'upi' && (
                    <div className="flex-1">
                      <label className="block text-xs text-gray-500 mb-1">Method</label>
                      <select value={transactionMethod} onChange={(e) => setTransactionMethod(e.target.value)} className="input-field text-sm">
                        {ONLINE_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>
                  )}
                  {method === 'card' && (
                    <div className="flex-1">
                      <label className="block text-xs text-gray-500 mb-1">Card Type</label>
                      <select value={transactionMethod} onChange={(e) => setTransactionMethod(e.target.value)} className="input-field text-sm">
                        {CARD_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>
                  )}
                </div>

                {(method === 'upi' || method === 'card') && (
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Transaction ID *</label>
                    <input
                      type="text"
                      value={transactionId}
                      onChange={(e) => setTransactionId(e.target.value)}
                      placeholder={method === 'upi' ? 'UPI Ref / Transaction ID' : 'Card Transaction ID'}
                      className="input-field text-sm"
                    />
                  </div>
                )}

                {method === 'company' && (
                  <>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <label className="block text-xs text-gray-500 mb-1">Order Number *</label>
                        <input
                          type="text"
                          value={companyOrderNumber}
                          onChange={(e) => setCompanyOrderNumber(e.target.value)}
                          placeholder="PO-001"
                          className="input-field text-sm"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block text-xs text-gray-500 mb-1">Order Date</label>
                        <input
                          type="date"
                          value={companyOrderDate}
                          onChange={(e) => setCompanyOrderDate(e.target.value)}
                          className="input-field text-sm"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Note</label>
                      <input
                        type="text"
                        value={companyNote}
                        onChange={(e) => setCompanyNote(e.target.value)}
                        placeholder="Any notes for this company order..."
                        className="input-field text-sm"
                      />
                    </div>
                  </>
                )}

                <button onClick={addPayment} className="btn-secondary w-full text-sm mt-1">
                  <FiPlus className="w-4 h-4 inline mr-1" />
                  Add {method} Payment
                </button>
              </div>
            </>
          )}

          {/* Confirm - Allow partial payment */}
          <div className="space-y-2">
            {paidTotal < total && paidTotal > 0 && (
              <div className="flex items-center gap-2 p-3 bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-800 rounded-lg">
                <FiAlertCircle className="w-5 h-5 text-warning-600 flex-shrink-0" />
                <p className="text-xs text-warning-700 dark:text-warning-300">
                  Partial payment of ₹{paidTotal.toFixed(2)}. Remaining ₹{remaining.toFixed(2)} will be recorded as balance due.
                </p>
              </div>
            )}
            <button
              onClick={validateAndConfirm}
              disabled={paidTotal <= 0}
              className={`w-full py-3 flex items-center justify-center gap-2 rounded-xl font-semibold transition-all ${
                paidTotal >= total
                  ? 'bg-success-600 hover:bg-success-700 text-white'
                  : paidTotal > 0
                    ? 'bg-warning-600 hover:bg-warning-700 text-white'
                    : 'bg-gray-300 dark:bg-gray-600 text-gray-500 cursor-not-allowed'
              }`}
            >
              {paidTotal >= total ? (
                <><FiCheck className="w-5 h-5" /> Complete Sale — ₹{paidTotal.toFixed(2)}</>
              ) : paidTotal > 0 ? (
                <><FiAlertCircle className="w-5 h-5" /> Confirm Partial — ₹{paidTotal.toFixed(2)}</>
              ) : (
                'Add at least one payment'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Receipt Modal ───
function ReceiptModal({ isOpen, onClose, order }) {
  if (!isOpen || !order) return null;

  // Guard against malformed order data (prevents blank page crashes)
  const safeOrder = {
    ...order,
    items: Array.isArray(order.items) ? order.items : [],
    payments: Array.isArray(order.payments) ? order.payments : [],
    customers: Array.isArray(order.customers) ? order.customers : [],
    orderNumber: order.orderNumber || 'N/A',
    createdAt: order.createdAt || new Date().toISOString(),
    subtotal: order.subtotal || 0,
    totalDiscount: order.totalDiscount || 0,
    totalCgst: order.totalCgst || 0,
    totalSgst: order.totalSgst || 0,
    grandTotal: order.grandTotal || 0,
    customerName: order.customerName || '',
    customerMobile: order.customerMobile || '',
    customerGstin: order.customerGstin || '',
    customerId: order.customerId || '',
  };

  const gstSummary = {};
  safeOrder.items.forEach(item => {
    const rate = item.gstRate || 0;
    if (!gstSummary[rate]) gstSummary[rate] = { rate, taxable: 0, cgst: 0, sgst: 0 };
    gstSummary[rate].taxable += item.taxableAmount || 0;
    gstSummary[rate].cgst += (item.gstAmount || 0) / 2;
    gstSummary[rate].sgst += (item.gstAmount || 0) / 2;
  });

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-sm w-full mx-4 animate-slide-up max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* Receipt Header */}
        <div className="text-center p-6 border-b dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">SALE RECEIPT</h2>
          <p className="text-xs text-gray-500 mt-1">{safeOrder.orderNumber}</p>
          <p className="text-xs text-gray-400 mt-0.5">{new Date(safeOrder.createdAt).toLocaleString('en-IN')}</p>
          {safeOrder.customerName && (
            <p className="text-xs text-gray-500 mt-1">{safeOrder.customerName}</p>
          )}
          {safeOrder.customerMobile && (
            <p className="text-xs text-gray-400">📞 {safeOrder.customerMobile}</p>
          )}
          {safeOrder.customerGstin && (
            <p className="text-xs text-gray-400">GST: {safeOrder.customerGstin}</p>
          )}
          {safeOrder.customerId && (
            <p className="text-xs text-gray-400">ID: {safeOrder.customerId}</p>
          )}

          {/* Additional Customers */}
          {safeOrder.customers.length > 0 && (
            <div className="mt-2 pt-2 border-t border-dashed dark:border-gray-700">
              <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1">Additional Customers</p>
              {safeOrder.customers.map((c, idx) => (
                <div key={idx} className="text-xs text-gray-500">
                  <span>{c.name}</span>
                  {c.phone && <span className="text-gray-400 ml-1">📞 {c.phone}</span>}
                  {c.customerId && <span className="text-gray-400 ml-1">({c.customerId})</span>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Items */}
        <div className="p-4 space-y-2">
          {safeOrder.items.map((item, i) => (
            <div key={i} className="flex justify-between text-sm">
              <div className="flex-1">
                <p className="text-gray-900 dark:text-white">{item.productName}</p>
                <p className="text-xs text-gray-500">{item.quantity} x ₹{(item.sellingPrice || 0).toFixed(2)}</p>
              </div>
              <p className="font-medium text-gray-900 dark:text-white">₹{(item.total || 0).toFixed(2)}</p>
            </div>
          ))}

          <hr className="dark:border-gray-700" />

          {/* Totals */}
          <div className="space-y-1 text-sm">
            <div className="flex justify-between text-gray-500">
              <span>Subtotal</span><span>₹{safeOrder.subtotal.toFixed(2)}</span>
            </div>
            {safeOrder.totalDiscount > 0 && (
              <div className="flex justify-between text-success-600">
                <span>Discount</span><span>-₹{safeOrder.totalDiscount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-gray-500">
              <span>CGST</span><span>₹{safeOrder.totalCgst.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-gray-500">
              <span>SGST</span><span>₹{safeOrder.totalSgst.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold text-gray-900 dark:text-white border-t dark:border-gray-700 pt-2 mt-2">
              <span>Total</span><span>₹{safeOrder.grandTotal.toFixed(2)}</span>
            </div>
          </div>

          {/* Payments */}
          <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg text-sm">
            <p className="font-medium text-gray-700 dark:text-gray-300 mb-1">Payments:</p>
            {safeOrder.payments.map((p, i) => (
              <div key={i} className="flex justify-between text-xs text-gray-500">
                <span className="capitalize">{p.method}</span>
                <span>₹{(p.amount || 0).toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 border-t dark:border-gray-700 flex gap-3">
          <button onClick={() => window.print()} className="btn-secondary flex-1 flex items-center justify-center gap-2">
            <FiPrinter className="w-4 h-4" /> Print
          </button>
          <button onClick={() => { onClose(); }} className="btn-primary flex-1">New Sale</button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
// ─── MAIN POS TERMINAL COMPONENT ───
// ═══════════════════════════════════════════════
export default function POSTerminal() {
  const navigate = useNavigate();
  const searchRef = useRef(null);

  // States
  const [viewMode, setViewMode] = useState('grid'); // grid | list
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [cart, setCart] = useState([]);
  // Single primary customer
  const [customer, setCustomer] = useState(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerResults, setCustomerResults] = useState([]);
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  // Quick / temp customer (no DB search)
  const [showQuickCustomer, setShowQuickCustomer] = useState(false);
  const [quickName, setQuickName] = useState('');
  const [quickPhone, setQuickPhone] = useState('');
  // Multi-customer support
  const [additionalCustomers, setAdditionalCustomers] = useState([]);
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustId, setNewCustId] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [showPayment, setShowPayment] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastOrder, setLastOrder] = useState(null);
  const [discountModal, setDiscountModal] = useState(null); // { productId, currentDiscount }
  const [discountInput, setDiscountInput] = useState(0);
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [taxToggle, setTaxToggle] = useState(true); // true = inclusive

  // ─── Load products ───
  const loadProducts = useCallback(async (search) => {
    setLoading(true);
    try {
      const params = { limit: 50 };
      if (search && search.trim()) params.search = search;
      if (activeCategory !== 'all') params.category = activeCategory;
      const res = await apiService.getProducts(params);
      setProducts(res.data?.data || []);
    } catch (err) {
      console.error('Product load error:', err);
    } finally {
      setLoading(false);
    }
  }, [activeCategory]);

  // Load categories
  useEffect(() => {
    apiService.getCategories().then(res => setCategories(res.data?.data || [])).catch(() => {});
  }, []);

  // Search effect
  useEffect(() => {
    const timer = setTimeout(() => loadProducts(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery, loadProducts]);

  // Focus search on mount
  useEffect(() => { searchRef.current?.focus(); }, []);

  // ─── Customer Search ───
  useEffect(() => {
    if (!customerSearch || customerSearch.length < 3) { setCustomerResults([]); return; }
    const timer = setTimeout(async () => {
      try {
        const res = await apiService.searchCustomers(customerSearch);
        setCustomerResults(res.data?.data || []);
      } catch (err) { setCustomerResults([]); }
    }, 300);
    return () => clearTimeout(timer);
  }, [customerSearch]);

  // ─── Quick Customer ───
  const addQuickCustomer = () => {
    if (!quickName.trim()) { toast.error('Customer name is required'); return; }
    setCustomer({ name: quickName.trim(), mobile: quickPhone.trim() });
    setQuickName('');
    setQuickPhone('');
    setShowQuickCustomer(false);
    toast.success('Quick customer added');
  };

  // ─── Multi-Customer Management ───
  const addAdditionalCustomer = () => {
    if (!newCustName.trim()) { toast.error('Customer name is required'); return; }
    setAdditionalCustomers([...additionalCustomers, {
      name: newCustName.trim(),
      customerId: newCustId.trim(),
      phone: newCustPhone.trim(),
    }]);
    setNewCustName('');
    setNewCustId('');
    setNewCustPhone('');
    setShowAddCustomer(false);
  };

  const removeAdditionalCustomer = (index) => {
    setAdditionalCustomers(additionalCustomers.filter((_, i) => i !== index));
  };

  // ─── Cart Operations ───
  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(item => (item._id || item.product) === product._id);
      if (existing) {
        if (existing.quantity >= (product.inventory?.quantity || 99)) {
          toast.error('Insufficient stock');
          return prev;
        }
        return prev.map(item =>
          (item._id || item.product) === product._id
            ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * item.sellingPrice * (1 - item.discountPercent / 100) }
            : item
        );
      }
      const sellingPrice = product.pricing?.sellingPrice || 0;
      const gstRate = product.pricing?.gstRate || 0;
      const gstAmount = taxToggle
        ? (sellingPrice * gstRate) / (100 + gstRate)
        : (sellingPrice * gstRate) / 100;
      return [...prev, {
        _id: product._id,
        product: product._id,
        productName: product.name,
        sku: product.sku,
        barcode: product.barcode,
        hsnCode: product.tax?.hsnCode,
        quantity: 1,
        mrp: product.pricing?.mrp || 0,
        sellingPrice,
        gstRate,
        gstAmount,
        discountPercent: 0,
        discountAmount: 0,
        taxableAmount: taxToggle ? sellingPrice - gstAmount : sellingPrice,
        total: sellingPrice,
      }];
    });
  };

  const updateQty = (productId, qty) => {
    if (qty <= 0) {
      setCart(prev => prev.filter(item => (item._id || item.product) !== productId));
      return;
    }
    setCart(prev => prev.map(item =>
      (item._id || item.product) === productId
        ? { ...item, quantity: qty, total: qty * item.sellingPrice * (1 - item.discountPercent / 100) }
        : item
    ));
  };

  const removeFromCart = (productId) => {
    setCart(prev => prev.filter(item => (item._id || item.product) !== productId));
  };

  const openDiscount = (productId) => {
    const item = cart.find(i => (i._id || i.product) === productId);
    setDiscountModal(productId);
    setDiscountInput(item?.discountPercent || 0);
  };

  const applyDiscount = () => {
    const disc = Math.min(100, Math.max(0, parseFloat(discountInput) || 0));
    setCart(prev => prev.map(item =>
      (item._id || item.product) === discountModal
        ? { ...item, discountPercent: disc, discountAmount: (item.sellingPrice * item.quantity * disc) / 100, total: item.sellingPrice * item.quantity * (1 - disc / 100) }
        : item
    ));
    setDiscountModal(null);
  };

  // ─── Calculate totals ───
  const subtotal = cart.reduce((s, item) => s + item.sellingPrice * item.quantity, 0);
  const totalDiscount = cart.reduce((s, item) => s + (item.sellingPrice * item.quantity * item.discountPercent / 100), 0);
  const totalTaxable = cart.reduce((s, item) => s + (item.taxableAmount || item.sellingPrice - (item.sellingPrice * item.gstRate / (100 + item.gstRate))) * item.quantity * (1 - item.discountPercent / 100), 0);
  const totalGst = cart.reduce((s, item) => s + ((item.gstAmount || 0) * item.quantity * (1 - item.discountPercent / 100)), 0);
  const totalCgst = totalGst / 2;
  const totalSgst = totalGst / 2;
  const grandTotal = Math.max(0, subtotal - totalDiscount + totalGst);

  // ─── Place Order ───
  const placeOrder = async (payments) => {
    try {
      const orderData = {
        items: cart.map(item => ({
          productId: item._id || item.product,
          productName: item.productName,
          quantity: item.quantity,
          sellingPrice: item.sellingPrice,
          discountPercent: item.discountPercent,
          mrp: item.mrp,
          batchNumber: item.batchNumber,
        })),
        payments: payments.map(p => ({
          method: p.method,
          amount: p.amount,
          transactionMethod: p.transactionMethod,
          transactionId: p.transactionId,
          companyOrderNumber: p.companyOrderNumber,
          companyOrderDate: p.companyOrderDate,
          companyNote: p.companyNote,
        })),
        customer: customer?._id || null,
        customerName: customer?.name || '',
        customerMobile: customer?.mobile || '',
        customers: additionalCustomers.length > 0 ? additionalCustomers : undefined,
        posMode: true,
        notes: '',
        type: 'retail',
      };

      const res = await apiService.createOrder(orderData);
      const order = res.data?.data || res.data;
      if (!order || !order._id) {
        throw new Error('Invalid order response from server');
      }
      setLastOrder(order);
      setShowReceipt(true);
      setCart([]);
      setCustomer(null);
      setAdditionalCustomers([]);
      toast.success(`Order ${order.orderNumber || ''} created successfully`);
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to create order');
    } finally {
      setShowPayment(false);
    }
  };

  // ─── Barcode Input ───
  const handleBarcodeInput = async (e) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      try {
        const res = await apiService.getByBarcode(searchQuery.trim());
        if (res.data?.data) { addToCart(res.data.data); setSearchQuery(''); toast.success('Product added via barcode'); }
      } catch {
        // If barcode not found, search normally
        loadProducts(searchQuery);
      }
    }
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col lg:flex-row">
      {/* ─── LEFT: Product Area ─── */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Search Bar */}
        <div className="p-3 bg-white dark:bg-gray-800 border-b dark:border-gray-700">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                ref={searchRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleBarcodeInput}
                placeholder="Search products by name, SKU, or scan barcode..."
                className="input-field pl-9 pr-4 py-2.5 text-sm"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><FiX className="w-4 h-4" /></button>
              )}
            </div>
            <button onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')} className="p-2.5 rounded-lg border dark:border-gray-600 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700">
              {viewMode === 'grid' ? <FiList className="w-4 h-4" /> : <FiGrid className="w-4 h-4" />}
            </button>
          </div>

          {/* Category Filter */}
          {categories.length > 0 && (
            <div className="flex gap-1.5 mt-2 overflow-x-auto pb-1">
              <button onClick={() => { setActiveCategory('all'); loadProducts(''); }} className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${activeCategory === 'all' ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'}`}>All</button>
              {categories.map(cat => (
                <button key={cat} onClick={() => { setActiveCategory(cat); loadProducts(''); }} className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${activeCategory === cat ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'}`}>{cat}</button>
              ))}
            </div>
          )}
        </div>

        {/* Products Grid/List */}
        <div className="flex-1 overflow-y-auto p-3">
          {loading ? (
            <div className="pos-product-grid">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="bg-gray-100 dark:bg-gray-700 rounded-xl aspect-square animate-pulse" />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <FiPackage className="w-16 h-16 mb-3 opacity-30" />
              <p className="text-sm">No products found</p>
              <p className="text-xs mt-1">Search by name, SKU, or scan a barcode</p>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="pos-product-grid">
              {products.map(product => (
                <ProductCard key={product._id} product={product} onAdd={addToCart} />
              ))}
            </div>
          ) : (
            <div className="space-y-1">
              {products.map(product => (
                <button key={product._id} onClick={() => addToCart(product)} disabled={product.inventory?.quantity <= 0}
                  className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50 disabled:opacity-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center overflow-hidden">
                      {getMainImageUrl(product.images) ? (
                        <img src={getMainImageUrl(product.images)} alt={product.name} className="w-full h-full object-cover" />
                      ) : (
                        <FiPackage className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{product.name}</p>
                      <p className="text-xs text-gray-500">SKU: {product.sku} · Stock: {product.inventory?.quantity}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-primary-600 dark:text-primary-400">₹{product.pricing?.sellingPrice?.toFixed(2)}</p>
                    <p className="text-xs text-gray-500">{product.pricing?.gstRate}% GST</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ─── RIGHT: Cart Area ─── */}
      <div className="w-full lg:w-96 xl:w-[420px] bg-white dark:bg-gray-800 border-t lg:border-t-0 lg:border-l dark:border-gray-700 flex flex-col">
        {/* Cart Header */}
        <div className="p-3 border-b dark:border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FiShoppingCart className="w-5 h-5 text-primary-600" />
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Current Bill</h2>
            <span className="text-xs bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 px-2 py-0.5 rounded-full">{cart.length} items</span>
          </div>
          {cart.length > 0 && (
            <button onClick={() => { if (window.confirm('Clear all items?')) setCart([]); }} className="text-xs text-danger-500 hover:text-danger-600">Clear All</button>
          )}
        </div>

        {/* Customer Selection */}
        <div className="p-3 border-b dark:border-gray-700 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Primary Customer</span>
            <FiUser className="w-3.5 h-3.5 text-gray-400" />
          </div>
          {customer ? (
            <div className="flex items-center justify-between bg-primary-50 dark:bg-primary-900/20 p-2 rounded-lg">
              <div>
                <p className="text-sm font-medium text-primary-700 dark:text-primary-400">{customer.name}</p>
                <p className="text-xs text-primary-500">{customer.mobile}</p>
              </div>
              <button onClick={() => setCustomer(null)} className="text-primary-400 hover:text-primary-600"><FiX className="w-4 h-4" /></button>
            </div>
          ) : showQuickCustomer ? (
            <div className="space-y-2 p-3 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-500">Quick Customer</span>
                <button onClick={() => { setShowQuickCustomer(false); setQuickName(''); setQuickPhone(''); }} className="text-gray-400 hover:text-gray-600"><FiX className="w-3.5 h-3.5" /></button>
              </div>
              <input
                type="text"
                value={quickName}
                onChange={(e) => setQuickName(e.target.value)}
                placeholder="Customer Name *"
                className="input-field text-sm"
                autoFocus
              />
              <input
                type="text"
                value={quickPhone}
                onChange={(e) => setQuickPhone(e.target.value)}
                placeholder="Phone (optional)"
                className="input-field text-sm"
              />
              <button onClick={addQuickCustomer} className="btn-primary text-xs w-full py-2">
                <FiCheck className="w-3.5 h-3.5 inline mr-1" />
                Add Customer
              </button>
            </div>
          ) : (
            <>
              <div className="relative">
                <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={customerSearch}
                  onChange={(e) => { setCustomerSearch(e.target.value); setShowCustomerSearch(true); }}
                  onFocus={() => setShowCustomerSearch(true)}
                  placeholder="Search customer..."
                  className="input-field pl-9 py-2 text-sm"
                />
                {showCustomerSearch && customerResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg shadow-lg z-10 max-h-40 overflow-y-auto">
                    {customerResults.map(c => (
                      <button key={c._id} onClick={() => { setCustomer(c); setCustomerSearch(''); setShowCustomerSearch(false); setCustomerResults([]); }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700">
                        <span className="font-medium text-gray-900 dark:text-white">{c.name}</span>
                        <span className="text-gray-500 ml-2">{c.mobile}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={() => setShowQuickCustomer(true)}
                className="text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1"
              >
                <FiPlus className="w-3 h-3" /> Quick Add Temp Customer
              </button>
            </>
          )}

          {/* Additional Customers */}
          <div className="pt-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                <FiUsers className="w-3 h-3 inline mr-1" />
                Additional Customers ({additionalCustomers.length})
              </span>
              <button
                onClick={() => setShowAddCustomer(true)}
                className="text-xs text-primary-600 hover:text-primary-700 flex items-center gap-0.5"
              >
                <FiPlus className="w-3 h-3" /> Add
              </button>
            </div>
            {additionalCustomers.map((ac, i) => (
              <div key={i} className="flex items-center justify-between bg-gray-50 dark:bg-gray-900 p-2 rounded-lg mb-1">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-900 dark:text-white truncate">{ac.name}</p>
                  <p className="text-[10px] text-gray-500">
                    {ac.customerId && `ID: ${ac.customerId}`}
                    {ac.customerId && ac.phone && ' | '}
                    {ac.phone && ac.phone}
                  </p>
                </div>
                <button onClick={() => removeAdditionalCustomer(i)} className="text-danger-400 hover:text-danger-600 flex-shrink-0">
                  <FiX className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            {showAddCustomer && (
              <div className="mt-2 p-3 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 space-y-2">
                <input
                  type="text"
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  placeholder="Customer Name *"
                  className="input-field text-sm"
                  autoFocus
                />
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newCustId}
                    onChange={(e) => setNewCustId(e.target.value)}
                    placeholder="Customer ID"
                    className="input-field text-sm flex-1"
                  />
                  <input
                    type="text"
                    value={newCustPhone}
                    onChange={(e) => setNewCustPhone(e.target.value)}
                    placeholder="Phone"
                    className="input-field text-sm flex-1"
                  />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setShowAddCustomer(false); setNewCustName(''); setNewCustId(''); setNewCustPhone(''); }} className="btn-secondary text-xs flex-1">Cancel</button>
                  <button onClick={addAdditionalCustomer} className="btn-primary text-xs flex-1">Add Customer</button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Cart Items (scrollable) */}
        <div className="flex-1 overflow-y-auto">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 p-6">
              <FiShoppingCart className="w-12 h-12 mb-3 opacity-30" />
              <p className="text-sm font-medium">Cart is empty</p>
              <p className="text-xs mt-1 text-center">Search products or scan barcode to add items</p>
            </div>
          ) : (
            cart.map(item => (
              <CartItemRow
                key={item._id || item.product}
                item={item}
                onUpdateQty={updateQty}
                onRemove={removeFromCart}
                onDiscount={openDiscount}
              />
            ))
          )}
        </div>

        {/* Bill Summary */}
        {cart.length > 0 && (
          <div className="border-t dark:border-gray-700 p-3 space-y-2 bg-gray-50 dark:bg-gray-900">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">Tax Mode:</span>
              <button
                onClick={() => setTaxToggle(!taxToggle)}
                className={`px-2 py-0.5 rounded text-xs font-medium ${taxToggle ? 'bg-primary-100 text-primary-700' : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400'}`}
              >
                {taxToggle ? 'GST Inclusive' : 'GST Exclusive'}
              </button>
            </div>

            <div className="space-y-1 text-sm">
              <div className="flex justify-between text-gray-500"><span>Subtotal</span><span>₹{subtotal.toFixed(2)}</span></div>
              {totalDiscount > 0 && <div className="flex justify-between text-success-600"><span>Discount</span><span>-₹{totalDiscount.toFixed(2)}</span></div>}
              <div className="flex justify-between text-gray-500"><span>CGST (50%)</span><span>₹{totalCgst.toFixed(2)}</span></div>
              <div className="flex justify-between text-gray-500"><span>SGST (50%)</span><span>₹{totalSgst.toFixed(2)}</span></div>
              <GstBreakup items={cart} />
            </div>

            <hr className="dark:border-gray-700" />

            <div className="flex justify-between text-base font-bold text-gray-900 dark:text-white">
              <span>Grand Total</span><span>₹{grandTotal.toFixed(2)}</span>
            </div>

            <button
              onClick={() => setShowPayment(true)}
              className="btn-primary w-full py-3 flex items-center justify-center gap-2 text-sm"
            >
              <FiDollarSign className="w-5 h-5" />
              Charge ₹{grandTotal.toFixed(2)}
            </button>
          </div>
        )}
      </div>

      {/* ─── Discount Modal ─── */}
      {discountModal && (
        <div className="modal-overlay" onClick={() => setDiscountModal(null)}>
          <div className="modal-content max-w-xs" onClick={e => e.stopPropagation()}>
            <div className="p-4">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Set Discount %</h3>
              <input
                type="number"
                value={discountInput}
                onChange={(e) => setDiscountInput(e.target.value)}
                min={0}
                max={100}
                step={0.5}
                className="input-field text-center text-2xl font-bold py-4"
                autoFocus
              />
              <div className="flex gap-2 mt-4">
                <button onClick={() => setDiscountModal(null)} className="btn-secondary flex-1">Cancel</button>
                <button onClick={applyDiscount} className="btn-primary flex-1">Apply</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Payment Modal ─── */}
      <PaymentModal
        isOpen={showPayment}
        onClose={() => setShowPayment(false)}
        onConfirm={placeOrder}
        total={grandTotal}
        balanceDue={grandTotal}
      />

      {/* ─── Receipt Modal ─── */}
      <ReceiptModal
        isOpen={showReceipt}
        onClose={() => setShowReceipt(false)}
        order={lastOrder}
      />
    </div>
  );
}
