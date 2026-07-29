import React, { useState, useEffect, useCallback } from 'react';
import { FiSearch, FiPlus, FiPackage, FiRefreshCw, FiX, FiEye, FiTruck, FiDollarSign, FiCalendar, FiUser, FiCheck, FiArrowRight } from 'react-icons/fi';
import { apiService } from '../../services/api';
import toast from 'react-hot-toast';

const statusColors = { draft: 'badge-info', sent: 'badge-warning', partial_received: 'badge-info', received: 'badge-success', cancelled: 'badge-danger' };

function PurchaseModal({ isOpen, onClose, onSaved }) {
  const [form, setForm] = useState({ supplier: '', invoiceNumber: '', invoiceDate: '', items: [], notes: '', paymentDueDate: '' });
  const [formErrors, setFormErrors] = useState({});
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    apiService.getSuppliers({ limit: 100 }).then(r => setSuppliers(r.data?.data || [])).catch(() => {});
    apiService.getProducts({ limit: 100 }).then(r => setProducts(r.data?.data || [])).catch(() => {});
    if (isOpen) {
      setForm({ supplier: '', invoiceNumber: '', invoiceDate: new Date().toISOString().split('T')[0], items: [{ product: '', quantity: 1, unitPrice: 0 }], notes: '', paymentDueDate: '' });
      setFormErrors({});
    }
  }, [isOpen]);

  const addItem = () => {
    setForm(f => ({ ...f, items: [...f.items, { product: '', quantity: 1, unitPrice: 0 }] }));
    if (formErrors.items) setFormErrors(prev => ({ ...prev, items: '' }));
  };
  const updateItem = (i, field, value) => {
    const items = [...form.items];
    items[i] = { ...items[i], [field]: value };
    if (field === 'product') {
      const p = products.find(pr => pr._id === value);
      if (p) items[i].unitPrice = p.pricing?.purchasePrice || 0;
    }
    setForm(f => ({ ...f, items }));
    // Clear item-level errors when user fixes them
    const key = `items.${i}.${field}`;
    if (formErrors[key]) setFormErrors(prev => ({ ...prev, [key]: '' }));
  };
  const removeItem = (i) => setForm(f => ({ ...f, items: f.items.filter((_, j) => j !== i) }));

  const validate = () => {
    const errors = {};
    if (!form.supplier) errors.supplier = 'Please select a supplier';
    if (!form.invoiceDate) errors.invoiceDate = 'Invoice date is required';
    if (form.items.length === 0) errors.items = 'At least one item is required';
    form.items.forEach((item, i) => {
      if (!item.product) errors[`items.${i}.product`] = 'Select a product';
      if (!item.quantity || item.quantity <= 0) errors[`items.${i}.quantity`] = 'Qty must be > 0';
      if (!item.unitPrice || item.unitPrice < 0) errors[`items.${i}.unitPrice`] = 'Enter a valid price';
    });
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormErrors({});
    if (!validate()) return;
    setSaving(true);
    try {
      // Map frontend field names to what backend expects
      const payload = {
        ...form,
        orderDate: form.invoiceDate,
        expectedDelivery: form.paymentDueDate || undefined,
      };
      await apiService.createPurchase(payload);
      toast.success('Purchase order created');
      onSaved?.();
      onClose();
    } catch (err) {
      const data = err.response?.data;
      // Show backend validation errors on specific fields
      if (data?.code === 'VALIDATION_ERROR' && data?.errors) {
        const fieldErrors = {};
        // Map backend field names to frontend field names
        const fieldMap = { orderDate: 'invoiceDate', expectedDelivery: 'paymentDueDate' };
        data.errors.forEach(e => {
          const frontendField = fieldMap[e.field] || e.field;
          fieldErrors[frontendField] = e.message;
        });
        setFormErrors(fieldErrors);
        toast.error('Please fix the highlighted fields');
      } else {
        toast.error(data?.message || 'Failed to create purchase');
      }
    } finally { setSaving(false); }
  };

  if (!isOpen) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white dark:bg-gray-800 z-10">
          <h3 className="text-lg font-semibold flex items-center gap-2"><FiPlus className="w-5 h-5 text-primary-500" /> New Purchase Order</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100"><FiX className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs font-medium mb-1">Supplier *</label>
              <select value={form.supplier} onChange={e => { setForm(f => ({ ...f, supplier: e.target.value })); if (formErrors.supplier) setFormErrors(prev => ({ ...prev, supplier: '' })); }} className={`input-field text-sm ${formErrors.supplier ? 'input-error' : ''}`}>
                <option value="">Select supplier</option>
                {suppliers.map(s => <option key={s._id} value={s._id}>{s.name} ({s.company || '-'})</option>)}
              </select>
              {formErrors.supplier && <p className="text-xs text-danger-500 mt-1">{formErrors.supplier}</p>}
            </div>
            <div><label className="block text-xs font-medium mb-1">Invoice Number</label>
              <input type="text" value={form.invoiceNumber} onChange={e => setForm(f => ({ ...f, invoiceNumber: e.target.value }))} className="input-field text-sm" placeholder="INV-001" />
            </div>
            <div><label className="block text-xs font-medium mb-1">Invoice Date *</label>
              <input type="date" value={form.invoiceDate} onChange={e => { setForm(f => ({ ...f, invoiceDate: e.target.value })); if (formErrors.invoiceDate) setFormErrors(prev => ({ ...prev, invoiceDate: '' })); }} className={`input-field text-sm ${formErrors.invoiceDate ? 'input-error' : ''}`} />
              {formErrors.invoiceDate && <p className="text-xs text-danger-500 mt-1">{formErrors.invoiceDate}</p>}
            </div>
            <div><label className="block text-xs font-medium mb-1">Payment Due</label>
              <input type="date" value={form.paymentDueDate} onChange={e => setForm(f => ({ ...f, paymentDueDate: e.target.value }))} className="input-field text-sm" />
            </div>
          </div>

          {/* Items */}
          <div><label className="block text-xs font-medium mb-2">Items *</label>
            {formErrors.items && <p className="text-xs text-danger-500 mb-2">{formErrors.items}</p>}
            {form.items.map((item, i) => (
              <div key={i} className="mb-2">
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <select value={item.product} onChange={e => updateItem(i, 'product', e.target.value)} className={`input-field text-sm w-full ${formErrors[`items.${i}.product`] ? 'input-error' : ''}`}>
                      <option value="">Select product</option>
                      {products.map(p => <option key={p._id} value={p._id}>{p.name} (₹{p.pricing?.purchasePrice || 0})</option>)}
                    </select>
                    {formErrors[`items.${i}.product`] && <p className="text-xs text-danger-500 mt-0.5">{formErrors[`items.${i}.product`]}</p>}
                  </div>
                  <div className="w-20">
                    <input type="number" value={item.quantity} onChange={e => { updateItem(i, 'quantity', parseInt(e.target.value) || 0); if (formErrors[`items.${i}.quantity`]) setFormErrors(prev => ({ ...prev, [`items.${i}.quantity`]: '' })); }} className={`input-field text-sm w-full text-center ${formErrors[`items.${i}.quantity`] ? 'input-error' : ''}`} min={1} placeholder="Qty" />
                    {formErrors[`items.${i}.quantity`] && <p className="text-xs text-danger-500 mt-0.5">{formErrors[`items.${i}.quantity`]}</p>}
                  </div>
                  <div className="w-24">
                    <input type="number" value={item.unitPrice} onChange={e => { updateItem(i, 'unitPrice', parseFloat(e.target.value) || 0); if (formErrors[`items.${i}.unitPrice`]) setFormErrors(prev => ({ ...prev, [`items.${i}.unitPrice`]: '' })); }} className={`input-field text-sm w-full text-right ${formErrors[`items.${i}.unitPrice`] ? 'input-error' : ''}`} min={0} step="0.01" placeholder="Price" />
                    {formErrors[`items.${i}.unitPrice`] && <p className="text-xs text-danger-500 mt-0.5">{formErrors[`items.${i}.unitPrice`]}</p>}
                  </div>
                  {form.items.length > 1 && <button type="button" onClick={() => removeItem(i)} className="text-danger-400 flex-shrink-0"><FiX className="w-4 h-4" /></button>}
                </div>
              </div>
            ))}
            <button type="button" onClick={addItem} className="btn-secondary text-xs mt-1"><FiPlus className="w-3 h-3 inline mr-1" /> Add Item</button>
          </div>

          <div><label className="block text-xs font-medium mb-1">Notes</label>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="input-field text-sm w-full" rows={2} />
          </div>

          <div className="flex gap-3 pt-4 border-t"><button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Creating...' : 'Create Purchase Order'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [showCreate, setShowCreate] = useState(false);
  const [detail, setDetail] = useState(null);
  const limit = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit };
      if (search) params.search = search;
      const res = await apiService.getPurchases(params);
      setPurchases(res.data?.data || []);
      setTotal(res.data?.pagination?.total || 0);
    } catch (err) { toast.error('Failed to load'); } finally { setLoading(false); }
  }, [page, search]);

  useEffect(() => { load(); }, [load]);

  const handleReceive = async (id) => {
    if (!window.confirm('Mark this purchase as received? Stock will be updated.')) return;
    try {
      await apiService.receivePurchase(id);
      toast.success('Purchase received');
      load();
    } catch (err) { toast.error('Failed to receive'); }
  };

  const pages = Math.ceil(total / limit);

  return (
    <div className="page-container">
      <div className="page-header">
        <div><h1 className="text-2xl font-bold">Purchases</h1><p className="text-sm text-gray-500 mt-1">{total} total purchase orders</p></div>
        <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2"><FiPlus className="w-4 h-4" /> New Purchase</button>
      </div>
      <div className="mb-4 flex gap-3">
        <div className="relative flex-1"><FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search by PO number, supplier..." className="input-field pl-9 py-2" /></div>
        <button onClick={load} disabled={loading} className="btn-secondary flex items-center gap-2"><FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh</button>
      </div>
      <div className="table-container">
        <table className="w-full">
          <thead><tr className="bg-gray-50 dark:bg-gray-900">
            <th className="table-header">PO #</th><th className="table-header">Supplier</th><th className="table-header">Items</th><th className="table-header">Amount</th><th className="table-header">Status</th><th className="table-header">Date</th><th className="table-header text-right">Action</th>
          </tr></thead>
          <tbody className="divide-y">
            {loading ? Array.from({ length: 5 }).map((_, i) => (<tr key={i}>{Array.from({ length: 7 }).map((_, j) => (<td key={j} className="table-cell"><div className="h-5 bg-gray-200 rounded animate-pulse" /></td>))}</tr>))
            : purchases.length === 0 ? <tr><td colSpan={7} className="text-center py-12 text-gray-400"><FiPackage className="w-12 h-12 mx-auto mb-3 opacity-30" /><p>No purchases found</p></td></tr>
            : purchases.map(p => (<tr key={p._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
              <td className="table-cell font-mono text-xs">{p.purchaseOrderNumber}</td>
              <td className="table-cell">{p.supplier?.name || p.supplier?.company || '-'}</td>
              <td className="table-cell">{p.items?.length || 0}</td>
              <td className="table-cell font-medium">₹{(p.grandTotal || 0).toLocaleString('en-IN')}</td>
              <td className="table-cell"><span className={statusColors[p.status]}>{p.status?.replace(/_/g, ' ')}</span></td>
              <td className="table-cell text-xs">{new Date(p.createdAt).toLocaleDateString('en-IN')}</td>
              <td className="table-cell text-right">
                <div className="flex items-center justify-end gap-1">
                  <button onClick={() => setDetail(p)} className="p-1.5 rounded hover:bg-gray-100 text-gray-400"><FiEye className="w-4 h-4" /></button>
                  {p.status === 'draft' || p.status === 'sent' ? (
                    <button onClick={() => handleReceive(p._id)} className="p-1.5 rounded hover:bg-gray-100 text-success-500"><FiCheck className="w-4 h-4" /></button>
                  ) : null}
                </div>
              </td>
            </tr>))}
          </tbody>
        </table>
      </div>
      {pages > 1 && <div className="flex justify-center gap-2 mt-4"><button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="btn-secondary text-sm px-3">Prev</button><span className="flex items-center text-sm text-gray-500 px-3">Page {page} of {pages}</span><button disabled={page >= pages} onClick={() => setPage(p => p + 1)} className="btn-secondary text-sm px-3">Next</button></div>}

      <PurchaseModal isOpen={showCreate} onClose={() => setShowCreate(false)} onSaved={load} />

      {/* Detail Modal */}
      {detail && <div className="modal-overlay" onClick={() => setDetail(null)}>
        <div className="modal-content max-w-lg" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between p-4 border-b"><h3 className="font-semibold">Purchase Detail</h3><button onClick={() => setDetail(null)} className="p-1 rounded hover:bg-gray-100"><FiX /></button></div>
          <div className="p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><p className="text-xs text-gray-500">PO #</p><p className="font-medium">{detail.purchaseOrderNumber}</p></div>
              <div><p className="text-xs text-gray-500">Supplier</p><p className="font-medium">{detail.supplier?.name || '-'}</p></div>
              <div><p className="text-xs text-gray-500">Date</p><p className="font-medium">{new Date(detail.createdAt).toLocaleDateString('en-IN')}</p></div>
              <div><p className="text-xs text-gray-500">Status</p><span className={statusColors[detail.status]}>{detail.status}</span></div>
            </div>
            <hr />
            <h4 className="text-sm font-semibold">Items</h4>
            {detail.items?.map((item, i) => (
              <div key={i} className="flex justify-between text-sm"><span>{item.productName} x {item.quantity}</span><span className="font-medium">₹{item.total?.toFixed(2)}</span></div>
            ))}
            <hr />
            <div className="flex justify-between text-lg font-bold"><span>Grand Total</span><span>₹{(detail.grandTotal || 0).toFixed(2)}</span></div>
          </div>
        </div>
      </div>}
    </div>
  );
}
