import React, { useState, useEffect, useCallback } from 'react';
import { FiSearch, FiEye, FiX, FiPackage, FiRefreshCw, FiDownload, FiEdit2, FiAlertCircle, FiCheck, FiUser, FiPlus, FiTrash2, FiDollarSign, FiSmartphone, FiCreditCard, FiUsers, FiCalendar, FiSave, FiFileText } from 'react-icons/fi';
import { apiService } from '../../services/api';
import toast from 'react-hot-toast';

const statusColors = { completed: 'badge-success', pending: 'badge-warning', cancelled: 'badge-danger', returned: 'badge-info' };
const paymentColors = { completed: 'badge-success', pending: 'badge-warning', partial: 'badge-info', refunded: 'badge-danger' };

// ─── Edit Order Modal ───
function EditOrderModal({ isOpen, onClose, order }) {
  const [form, setForm] = useState({
    customerName: '', customerMobile: '', customerGstin: '', customerId: '',
    customers: [], notes: '', payments: [], items: [],
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (order) {
      setForm({
        customerName: order.customerName || '',
        customerMobile: order.customerMobile || '',
        customerGstin: order.customerGstin || '',
        customerId: order.customerId || '',
        customers: order.customers || [],
        notes: order.notes || '',
        payments: (order.payments || []).map(p => ({
          method: p.method,
          amount: p.amount,
          transactionMethod: p.transactionMethod || '',
          transactionId: p.transactionId || '',
          companyOrderNumber: p.companyOrderNumber || '',
          companyOrderDate: p.companyOrderDate ? new Date(p.companyOrderDate).toISOString().split('T')[0] : '',
          companyNote: p.companyNote || '',
        })),
        items: (order.items || []).map(i => ({
          product: i.product?._id || i.product,
          productName: i.productName,
          quantity: i.quantity,
          sellingPrice: i.sellingPrice,
          discountPercent: i.discountPercent,
        })),
      });
    }
  }, [order]);

  const handleCustomerChange = (idx, field, value) => {
    const updated = [...form.customers];
    updated[idx] = { ...updated[idx], [field]: value };
    setForm(f => ({ ...f, customers: updated }));
  };

  const addCustomer = () => {
    setForm(f => ({ ...f, customers: [...f.customers, { name: '', customerId: '', phone: '' }] }));
  };

  const removeCustomer = (idx) => {
    setForm(f => ({ ...f, customers: f.customers.filter((_, i) => i !== idx) }));
  };

  const handleItemChange = (idx, field, value) => {
    const updated = [...form.items];
    updated[idx] = { ...updated[idx], [field]: value };
    setForm(f => ({ ...f, items: updated }));
  };

  const handlePaymentChange = (idx, field, value) => {
    const updated = [...form.payments];
    updated[idx] = { ...updated[idx], [field]: value };
    setForm(f => ({ ...f, payments: updated }));
  };

  const removePayment = (idx) => {
    setForm(f => ({ ...f, payments: f.payments.filter((_, i) => i !== idx) }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiService.updateOrder(order._id, {
        customerName: form.customerName,
        customerMobile: form.customerMobile,
        customerGstin: form.customerGstin,
        customerId: form.customerId,
        customers: form.customers.filter(c => c.name),
        notes: form.notes,
        items: form.items.filter(i => i.product && i.quantity > 0).map(i => ({
          product: i.product,
          quantity: i.quantity,
          sellingPrice: i.sellingPrice,
          discountPercent: i.discountPercent || 0,
        })),
        payments: form.payments.map(p => ({
          method: p.method,
          amount: p.amount,
          transactionMethod: p.transactionMethod || undefined,
          transactionId: p.transactionId || undefined,
          companyOrderNumber: p.companyOrderNumber || undefined,
          companyOrderDate: p.companyOrderDate || undefined,
          companyNote: p.companyNote || undefined,
        })),
      });
      toast.success('Order updated successfully');
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update order');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen || !order) return null;

  const paymentMethods = [
    { id: 'cash', label: 'Cash', color: 'text-green-600' },
    { id: 'online', label: 'Online', color: 'text-blue-600' },
    { id: 'card', label: 'Card', color: 'text-yellow-600' },
    { id: 'company', label: 'Company', color: 'text-violet-600' },
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content max-w-3xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <FiEdit2 className="w-5 h-5 text-primary-500" />
            Edit Order — {order.orderNumber}
          </h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100"><FiX className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-6">
          {/* Customer Details */}
          <section>
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-3 flex items-center gap-1"><FiUser className="w-4 h-4" /> Customer Details</h4>
            <div className="grid grid-cols-2 gap-3">
              <input value={form.customerName} onChange={e => setForm(f => ({ ...f, customerName: e.target.value }))} placeholder="Customer Name" className="input-field text-sm" />
              <input value={form.customerMobile} onChange={e => setForm(f => ({ ...f, customerMobile: e.target.value }))} placeholder="Phone" className="input-field text-sm" />
              <input value={form.customerGstin} onChange={e => setForm(f => ({ ...f, customerGstin: e.target.value }))} placeholder="GSTIN" className="input-field text-sm" />
              <input value={form.customerId} onChange={e => setForm(f => ({ ...f, customerId: e.target.value }))} placeholder="Customer ID" className="input-field text-sm" />
            </div>
          </section>

          {/* Additional Customers */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center gap-1"><FiUsers className="w-4 h-4" /> Additional Customers ({form.customers.length})</h4>
              <button type="button" onClick={addCustomer} className="text-xs text-primary-600 hover:text-primary-700 flex items-center gap-0.5"><FiPlus className="w-3 h-3" /> Add</button>
            </div>
            {form.customers.length === 0 && <p className="text-xs text-gray-400">No additional customers</p>}
            {form.customers.map((c, i) => (
              <div key={i} className="flex items-center gap-2 mb-2">
                <input value={c.name} onChange={e => handleCustomerChange(i, 'name', e.target.value)} placeholder="Name" className="input-field text-sm flex-1" />
                <input value={c.customerId} onChange={e => handleCustomerChange(i, 'customerId', e.target.value)} placeholder="ID" className="input-field text-sm w-24" />
                <input value={c.phone} onChange={e => handleCustomerChange(i, 'phone', e.target.value)} placeholder="Phone" className="input-field text-sm w-28" />
                <button type="button" onClick={() => removeCustomer(i)} className="text-danger-400 hover:text-danger-600"><FiX className="w-4 h-4" /></button>
              </div>
            ))}
          </section>

          {/* Items */}
          <section>
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-3 flex items-center gap-1"><FiPackage className="w-4 h-4" /> Items</h4>
            {form.items.map((item, i) => (
              <div key={i} className="flex items-center gap-2 mb-2">
                <span className="text-sm text-gray-600 flex-1">{item.productName}</span>
                <input type="number" value={item.quantity} onChange={e => handleItemChange(i, 'quantity', parseFloat(e.target.value) || 0)} className="input-field text-sm w-20 text-center" min={0} />
                <input type="number" value={item.sellingPrice} onChange={e => handleItemChange(i, 'sellingPrice', parseFloat(e.target.value) || 0)} className="input-field text-sm w-24 text-right" min={0} step="0.01" />
                <input type="number" value={item.discountPercent || 0} onChange={e => handleItemChange(i, 'discountPercent', parseFloat(e.target.value) || 0)} className="input-field text-sm w-16 text-center" min={0} max={100} step="0.5" />
              </div>
            ))}
          </section>

          {/* Payments */}
          <section>
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-3 flex items-center gap-1"><FiDollarSign className="w-4 h-4" /> Payments</h4>
            {form.payments.map((p, i) => (
              <div key={i} className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg mb-2 space-y-2">
                <div className="flex items-center justify-between">
                  <select value={p.method} onChange={e => handlePaymentChange(i, 'method', e.target.value)} className="input-field text-sm w-28 capitalize">
                    {paymentMethods.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
                  </select>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">₹</span>
                    <input type="number" value={p.amount} onChange={e => handlePaymentChange(i, 'amount', parseFloat(e.target.value) || 0)} className="input-field text-sm w-24 text-right" min={0} step="0.01" />
                    <button type="button" onClick={() => removePayment(i)} className="text-danger-400 hover:text-danger-600"><FiX className="w-4 h-4" /></button>
                  </div>
                </div>
                {(p.method === 'online' || p.method === 'card') && (
                  <div className="flex gap-2">
                    <input value={p.transactionMethod} onChange={e => handlePaymentChange(i, 'transactionMethod', e.target.value)} placeholder={p.method === 'online' ? 'UPI / Net Banking' : 'Credit / Debit'} className="input-field text-xs flex-1" />
                    <input value={p.transactionId} onChange={e => handlePaymentChange(i, 'transactionId', e.target.value)} placeholder="Transaction ID" className="input-field text-xs flex-1" />
                  </div>
                )}
                {p.method === 'company' && (
                  <div className="flex gap-2">
                    <input value={p.companyOrderNumber} onChange={e => handlePaymentChange(i, 'companyOrderNumber', e.target.value)} placeholder="Order Number" className="input-field text-xs flex-1" />
                    <input type="date" value={p.companyOrderDate} onChange={e => handlePaymentChange(i, 'companyOrderDate', e.target.value)} className="input-field text-xs w-36" />
                    <input value={p.companyNote} onChange={e => handlePaymentChange(i, 'companyNote', e.target.value)} placeholder="Note" className="input-field text-xs flex-1" />
                  </div>
                )}
              </div>
            ))}
          </section>

          {/* Notes */}
          <section>
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">Notes</h4>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="input-field text-sm w-full" rows={2} placeholder="Order notes..." />
          </section>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t dark:border-gray-700">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
              <FiSave className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Order Detail Modal ───
function OrderDetailModal({ isOpen, onClose, orderId, onEdit }) {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [invoiceLoading, setInvoiceLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !orderId) return;
    setLoading(true);
    apiService.getOrder(orderId).then(res => setOrder(res.data?.data || res.data)).catch(() => toast.error('Failed to load order')).finally(() => setLoading(false));
  }, [isOpen, orderId]);

  const handleDownloadInvoice = async (orderId) => {
    setInvoiceLoading(true);
    try {
      const res = await apiService.generateOrderInvoice(orderId);
      const invoice = res.data?.data;
      if (invoice?.url) {
        // Create a temporary link to trigger download reliably (bypasses popup blockers)
        const link = document.createElement('a');
        link.href = invoice.url;
        link.download = invoice.fileName || 'invoice.pdf';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('Invoice downloaded!');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to generate invoice');
    } finally {
      setInvoiceLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content max-w-2xl max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
          <h3 className="text-lg font-semibold">Order Details</h3>
          <div className="flex items-center gap-2">
            {order && !['cancelled', 'returned'].includes(order.status) && (
              <>
                <button onClick={() => handleDownloadInvoice(order._id)} className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1" disabled={invoiceLoading}>
                  <FiFileText className="w-3.5 h-3.5" />
                  {invoiceLoading ? 'Generating...' : 'Invoice'}
                </button>
                <button onClick={() => { onEdit?.(order); onClose(); }} className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1"><FiEdit2 className="w-3.5 h-3.5" /> Edit</button>
              </>
            )}
            <button onClick={onClose} className="p-1 rounded hover:bg-gray-100"><FiX className="w-5 h-5" /></button>
          </div>
        </div>
        {loading ? <div className="p-8 text-center text-gray-400">Loading...</div> : !order ? <div className="p-8 text-center text-gray-400">Order not found</div> : (
          <div className="p-4 space-y-4">
            {/* Partial Payment Alert */}
            {order.isPartialPayment && (
              <div className="flex items-start gap-3 p-3 bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-800 rounded-lg">
                <FiAlertCircle className="w-5 h-5 text-warning-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-warning-700 dark:text-warning-300">Partial Payment</p>
                  <p className="text-xs text-warning-600 dark:text-warning-400 mt-0.5">
                    Only ₹{(order.paidAmount || 0).toFixed(2)} paid out of ₹{(order.grandTotal || 0).toFixed(2)}.
                    Balance due: ₹{(order.balanceDue || 0).toFixed(2)}
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div><p className="text-xs text-gray-500">Order #</p><p className="font-medium">{order.orderNumber}</p></div>
              <div><p className="text-xs text-gray-500">Invoice #</p><p className="font-medium">{order.invoiceNumber}</p></div>
              <div><p className="text-xs text-gray-500">Date</p><p className="font-medium">{new Date(order.createdAt).toLocaleString('en-IN')}</p></div>
              <div><p className="text-xs text-gray-500">Customer</p><p className="font-medium">{order.customerName || 'Walk-in'}{order.customerMobile && ` (${order.customerMobile})`}</p></div>
              <div><p className="text-xs text-gray-500">Status</p><span className={statusColors[order.status]}>{order.status}</span></div>
              <div>
                <p className="text-xs text-gray-500">Payment</p>
                <span className={`${paymentColors[order.paymentStatus]} ${order.isPartialPayment ? 'ring-2 ring-warning-400' : ''}`}>
                  {order.paymentStatus}
                </span>
              </div>
            </div>

            {/* Additional Customers */}
            {order.customers && order.customers.length > 0 && (
              <>
                <hr />
                <h4 className="font-semibold flex items-center gap-1"><FiUsers className="w-4 h-4 text-primary-500" /> Additional Customers</h4>
                {order.customers.map((c, i) => (
                  <div key={i} className="flex items-center justify-between text-sm p-2 bg-gray-50 dark:bg-gray-900 rounded-lg">
                    <span className="font-medium">{c.name}</span>
                    <div className="text-xs text-gray-500">
                      {c.customerId && <span>ID: {c.customerId} </span>}
                      {c.phone && <span>| {c.phone}</span>}
                    </div>
                  </div>
                ))}
              </>
            )}

            <hr />
            <h4 className="font-semibold">Items</h4>
            <table className="w-full text-sm"><thead><tr className="bg-gray-50 dark:bg-gray-900"><th className="p-2 text-left text-xs font-medium text-gray-500">Product</th><th className="p-2 text-right text-xs font-medium text-gray-500">Qty</th><th className="p-2 text-right text-xs font-medium text-gray-500">Rate</th><th className="p-2 text-right text-xs font-medium text-gray-500">GST</th><th className="p-2 text-right text-xs font-medium text-gray-500">Total</th></tr></thead>
              <tbody className="divide-y">{(order.items || []).map((item, i) => (<tr key={i}><td className="p-2">{item.productName}<br /><span className="text-xs text-gray-500">{item.hsnCode}</span></td><td className="p-2 text-right">{item.quantity}</td><td className="p-2 text-right">₹{item.sellingPrice?.toFixed(2)}</td><td className="p-2 text-right">{item.gstRate}%</td><td className="p-2 text-right font-medium">₹{item.total?.toFixed(2)}</td></tr>))}</tbody></table>
            <hr /><div className="space-y-1 text-sm"><div className="flex justify-between"><span>Subtotal</span><span>₹{(order.subtotal || 0).toFixed(2)}</span></div>{order.totalDiscount > 0 && <div className="flex justify-between text-success-600"><span>Discount</span><span>-₹{(order.totalDiscount || 0).toFixed(2)}</span></div>}<div className="flex justify-between"><span>CGST</span><span>₹{(order.totalCgst || 0).toFixed(2)}</span></div><div className="flex justify-between"><span>SGST</span><span>₹{(order.totalSgst || 0).toFixed(2)}</span></div><div className="flex justify-between text-lg font-bold border-t pt-2 mt-2"><span>Grand Total</span><span>₹{(order.grandTotal || 0).toFixed(2)}</span></div></div>

            {/* Payments */}
            {(order.payments || []).length > 0 && <><hr /><h4 className="font-semibold">Payments</h4>
              {order.payments.map((p, i) => (
                <div key={i} className="flex items-center justify-between text-sm p-2 bg-gray-50 dark:bg-gray-900 rounded-lg mb-1">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${
                      p.method === 'cash' ? 'bg-green-500' : p.method === 'online' ? 'bg-blue-500' :
                      p.method === 'card' ? 'bg-yellow-500' : 'bg-violet-500'
                    }`} />
                    <span className="capitalize font-medium">{p.method}</span>
                    {p.transactionId && <span className="text-xs text-gray-500">({p.transactionMethod}: {p.transactionId})</span>}
                    {p.companyOrderNumber && <span className="text-xs text-gray-500">(PO: {p.companyOrderNumber})</span>}
                  </div>
                  <span className="font-medium">₹{p.amount?.toFixed(2)}</span>
                </div>
              ))}
            </>}

            <div className="flex justify-end gap-3 pt-4">
              <button onClick={onClose} className="btn-secondary">Close</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Orders Page ───
export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [detailOrderId, setDetailOrderId] = useState(null);
  const [editOrder, setEditOrder] = useState(null);
  const limit = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      if (dateRange.start) params.startDate = dateRange.start;
      if (dateRange.end) params.endDate = dateRange.end;
      const res = await apiService.getOrders(params);
      setOrders(res.data?.data || []); setTotal(res.data?.pagination?.total || 0);
    } catch (err) { toast.error('Failed to load'); } finally { setLoading(false); }
  }, [page, search, statusFilter, dateRange]);

  useEffect(() => { load(); }, [load]);

  const pages = Math.ceil(total / limit);

  return (
    <div className="page-container">
      <div className="page-header">
        <div><h1 className="text-2xl font-bold">Orders</h1><p className="text-sm text-gray-500 mt-1">{total} total orders</p></div>
        <div className="flex items-center gap-2 flex-wrap">
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} className="input-field w-auto text-sm py-2">
            <option value="">All Status</option><option value="completed">Completed</option><option value="pending">Pending</option><option value="cancelled">Cancelled</option><option value="returned">Returned</option>
          </select>
          <select value={paymentFilter} onChange={e => { setPaymentFilter(e.target.value); setPage(1); }} className="input-field w-auto text-sm py-2">
            <option value="">All Payments</option><option value="completed">Completed</option><option value="partial">Partial</option><option value="pending">Pending</option>
          </select>
          <input type="date" value={dateRange.start} onChange={e => setDateRange(d => ({ ...d, start: e.target.value }))} className="input-field w-auto text-sm py-2" />
          <input type="date" value={dateRange.end} onChange={e => setDateRange(d => ({ ...d, end: e.target.value }))} className="input-field w-auto text-sm py-2" />
        </div>
      </div>
      <div className="mb-4 relative"><FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /><input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search by order number, customer name, mobile..." className="input-field pl-9 py-2.5" /></div>
      <div className="table-container">
        <table className="w-full">
          <thead><tr className="bg-gray-50 dark:bg-gray-900">
            <th className="table-header">Primary Customer</th><th className="table-header">Order / Date</th><th className="table-header">Additional Customers</th><th className="table-header">Items</th><th className="table-header">Amount</th><th className="table-header">Status</th><th className="table-header">Payment</th><th className="table-header text-right">Action</th>
          </tr></thead>
          <tbody className="divide-y dark:divide-gray-700">
            {loading ? Array.from({ length: 8 }).map((_, i) => (<tr key={i}>{Array.from({ length: 8 }).map((_, j) => (<td key={j} className="table-cell"><div className="h-5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" /></td>))}</tr>))
            : orders.length === 0 ? <tr><td colSpan={8} className="text-center py-12 text-gray-400"><FiPackage className="w-12 h-12 mx-auto mb-3 opacity-30" /><p>No orders found</p></td></tr>
            : orders.map(o => (<tr key={o._id} className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 ${o.isPartialPayment ? 'bg-warning-50/50 dark:bg-warning-900/10' : ''}`}>
              <td className="table-cell">
                <div className="font-medium text-gray-900 dark:text-white text-xs">{o.customerName || 'Walk-in'}</div>
                {o.customerMobile && <span className="text-xs text-gray-500">{o.customerMobile}</span>}
              </td>
              <td className="table-cell">
                <div className="font-mono text-xs text-gray-900 dark:text-white">{o.orderNumber}</div>
                <span className="text-xs text-gray-400">{new Date(o.createdAt).toLocaleDateString('en-IN')} {new Date(o.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
              </td>
              <td className="table-cell">
                {o.customers?.length > 0 ? (
                  <div className="text-[10px] text-primary-600 dark:text-primary-400 space-y-1">
                    {o.customers.map((c, idx) => (
                      <div key={idx} className="flex items-start gap-1">
                        <FiUsers className="w-2.5 h-2.5 flex-shrink-0 mt-0.5" />
                        <div>
                          <span className="font-medium">{c.name}</span>
                          <div className="text-gray-400">
                            {c.customerId && <span>ID: {c.customerId}</span>}
                            {c.customerId && c.phone && <span> · </span>}
                            {c.phone && <span>{c.phone}</span>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className="text-xs text-gray-400">—</span>
                )}
              </td>
              <td className="table-cell">{o.items?.length || 0}</td>
              <td className="table-cell font-medium">₹{(o.grandTotal || 0).toLocaleString('en-IN')}</td>
              <td className="table-cell"><span className={statusColors[o.status]}>{o.status}</span></td>
              <td className="table-cell">
                <span className={`${paymentColors[o.paymentStatus]} ${o.isPartialPayment ? 'flex items-center gap-1' : ''}`}>
                  {o.isPartialPayment && <FiAlertCircle className="w-3 h-3 text-warning-500" />}
                  {o.paymentStatus}
                  {o.isPartialPayment && <span className="text-xs opacity-70">(₹{(o.balanceDue || 0).toFixed(0)})</span>}
                </span>
              </td>
              <td className="table-cell text-right">
                <div className="flex items-center justify-end gap-1">
                  <button onClick={() => setDetailOrderId(o._id)} className="p-1.5 rounded hover:bg-gray-100 text-gray-400" title="View"><FiEye className="w-4 h-4" /></button>
                  {o.status !== 'cancelled' && o.status !== 'returned' && (
                    <button onClick={() => { setEditOrder(o); }} className="p-1.5 rounded hover:bg-gray-100 text-primary-500" title="Edit"><FiEdit2 className="w-4 h-4" /></button>
                  )}
                </div>
              </td>
            </tr>))}
          </tbody>
        </table>
      </div>
      {pages > 1 && <div className="flex justify-center gap-2 mt-4"><button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="btn-secondary text-sm px-3">Prev</button><span className="flex items-center text-sm text-gray-500 px-3">Page {page} of {pages}</span><button disabled={page >= pages} onClick={() => setPage(p => p + 1)} className="btn-secondary text-sm px-3">Next</button></div>}
      
      {/* Order Detail Modal */}
      <OrderDetailModal
        isOpen={!!detailOrderId}
        onClose={() => setDetailOrderId(null)}
        orderId={detailOrderId}
        onEdit={(order) => { setEditOrder(order); }}
      />
      
      {/* Edit Order Modal */}
      <EditOrderModal
        isOpen={!!editOrder}
        onClose={() => { setEditOrder(null); load(); }}
        order={editOrder}

      />
    </div>
  );
}
