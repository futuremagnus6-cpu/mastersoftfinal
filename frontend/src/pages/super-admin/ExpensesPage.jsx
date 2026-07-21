import React, { useState, useEffect, useCallback } from 'react';
import { FiSearch, FiPlus, FiDollarSign, FiRefreshCw, FiX, FiEdit2, FiTrash2, FiCheck, FiFilter, FiCalendar } from 'react-icons/fi';
import { apiService } from '../../services/api';
import toast from 'react-hot-toast';

const categories = ['rent', 'salary', 'marketing', 'electricity', 'internet', 'maintenance', 'transport', 'packaging', 'utilities', 'insurance', 'taxes', 'professional_fees', 'office_supplies', 'staff_welfare', 'depreciation', 'miscellaneous'];

function ExpenseModal({ isOpen, onClose, expense, onSaved, shops }) {
  const [form, setForm] = useState({
    category: 'miscellaneous', amount: 0, description: '', date: new Date().toISOString().split('T')[0],
    paymentMethod: 'cash', reference: '', vendor: '', notes: '', shopId: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (expense) {
      setForm({
        category: expense.category, amount: expense.amount, description: expense.description,
        date: new Date(expense.date).toISOString().split('T')[0], paymentMethod: expense.paymentMethod,
        reference: expense.reference || '', vendor: expense.vendor || '', notes: expense.notes || '',
        shopId: expense.shopId?._id || expense.shopId || '',
      });
    } else {
      setForm({ category: 'miscellaneous', amount: 0, description: '', date: new Date().toISOString().split('T')[0], paymentMethod: 'cash', reference: '', vendor: '', notes: '', shopId: '' });
    }
  }, [expense, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.description || !form.amount || form.amount <= 0) { toast.error('Description and valid amount required'); return; }
    setSaving(true);
    try {
      // Build payload — only include shopId if selected (platform expense otherwise)
      const payload = { ...form };
      if (!payload.shopId) delete payload.shopId;

      if (expense) await apiService.updateExpense(expense._id, payload);
      else await apiService.createExpense(payload);
      toast.success(expense ? 'Expense updated' : 'Expense created');
      onSaved?.(); onClose();
    } catch (err) { toast.error('Failed to save'); } finally { setSaving(false); }
  };

  if (!isOpen) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
          <h3 className="font-semibold text-gray-900 dark:text-white">{expense ? 'Edit' : 'New'} Expense</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"><FiX className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          {/* Shop Selector — only show for new expenses */}
          {!expense && shops && shops.length > 0 && (
            <div>
              <label className="block text-xs font-medium mb-1">Shop (optional — leave empty for platform expense)</label>
              <select value={form.shopId} onChange={e => setForm(f => ({ ...f, shopId: e.target.value }))} className="input-field text-sm">
                <option value="">— Platform Expense —</option>
                {shops.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs font-medium mb-1">Category *</label>
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="input-field text-sm">
                {categories.map(c => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
            <div><label className="block text-xs font-medium mb-1">Amount *</label>
              <input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: parseFloat(e.target.value) || 0 }))} className="input-field text-sm" min={0} step="0.01" required />
            </div>
          </div>
          <div><label className="block text-xs font-medium mb-1">Description *</label>
            <input type="text" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="input-field text-sm" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs font-medium mb-1">Date</label>
              <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="input-field text-sm" />
            </div>
            <div><label className="block text-xs font-medium mb-1">Payment Method</label>
              <select value={form.paymentMethod} onChange={e => setForm(f => ({ ...f, paymentMethod: e.target.value }))} className="input-field text-sm">
                {['cash', 'bank_transfer', 'cheque', 'upi', 'card', 'credit'].map(m => <option key={m} value={m}>{m.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs font-medium mb-1">Vendor</label><input type="text" value={form.vendor} onChange={e => setForm(f => ({ ...f, vendor: e.target.value }))} className="input-field text-sm" /></div>
            <div><label className="block text-xs font-medium mb-1">Reference</label><input type="text" value={form.reference} onChange={e => setForm(f => ({ ...f, reference: e.target.value }))} className="input-field text-sm" /></div>
          </div>
          <div><label className="block text-xs font-medium mb-1">Notes</label><textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="input-field text-sm w-full" rows={2} /></div>
          <div className="flex gap-3 pt-4 border-t dark:border-gray-700">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Saving...' : expense ? 'Update' : 'Create'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function SuperAdminExpensesPage() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [editExpense, setEditExpense] = useState(null);
  const [shops, setShops] = useState([]);
  const [filterShop, setFilterShop] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const limit = 20;

  // Load shops for filter dropdown
  useEffect(() => {
    apiService.getShops({ limit: 200, sort: 'name' })
      .then(res => setShops(res.data?.data || []))
      .catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit, sort: '-date' };
      if (search) params.search = search;
      if (filterShop !== 'all') params.shopId = filterShop;
      if (filterCategory !== 'all') params.category = filterCategory;
      if (filterStatus !== 'all') params.status = filterStatus;

      const res = await apiService.getExpenses(params);
      setExpenses(res.data?.data || []);
      setTotal(res.data?.pagination?.total || 0);
      setTotalAmount(res.data?.totals?.total || 0);
    } catch (err) { toast.error('Failed to load expenses'); } finally { setLoading(false); }
  }, [page, search, filterShop, filterCategory, filterStatus]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this expense?')) return;
    try { await apiService.deleteExpense(id); toast.success('Deleted'); load(); } catch (err) { toast.error('Failed to delete'); }
  };

  const handleApprove = async (id) => {
    try { await apiService.approveExpense(id); toast.success('Approved'); load(); } catch (err) { toast.error('Failed to approve'); }
  };

  const getShopName = (shop) => {
    if (!shop) return '— Platform —';
    if (typeof shop === 'string') return shops.find(s => s._id === shop)?.name || 'Unknown';
    if (typeof shop === 'object' && shop.name) return shop.name;
    return 'Unknown';
  };

  const pages = Math.ceil(total / limit);

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Expenses</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {total} total expenses · ₹{totalAmount.toLocaleString('en-IN')} · {expenses.filter(e => !e.shopId).length} platform
          </p>
        </div>
        <button onClick={() => { setEditExpense(null); setShowModal(true); }} className="btn-primary flex items-center gap-2">
          <FiPlus className="w-4 h-4" /> New Expense
        </button>
      </div>

      {/* Search & Filters */}
      <div className="mb-4 space-y-2">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search expenses..." className="input-field pl-9 py-2 text-sm w-full"
            />
          </div>
          <button onClick={() => setShowFilters(!showFilters)} className={`btn-secondary flex items-center gap-2 ${showFilters ? 'ring-2 ring-primary-500' : ''}`}>
            <FiFilter className="w-4 h-4" /> Filters
          </button>
          <button onClick={load} disabled={loading} className="btn-secondary flex items-center gap-2">
            <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>

        {showFilters && (
          <div className="flex flex-wrap gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border dark:border-gray-700">
            <div className="flex-1 min-w-[150px]">
              <label className="block text-xs font-medium text-gray-500 mb-1">Shop</label>
              <select value={filterShop} onChange={e => { setFilterShop(e.target.value); setPage(1); }} className="input-field text-sm">
                <option value="all">All Shops</option>
                <option value="">Platform Expenses</option>
                {shops.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
              </select>
            </div>
            <div className="flex-1 min-w-[150px]">
              <label className="block text-xs font-medium text-gray-500 mb-1">Category</label>
              <select value={filterCategory} onChange={e => { setFilterCategory(e.target.value); setPage(1); }} className="input-field text-sm">
                <option value="all">All Categories</option>
                {categories.map(c => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
            <div className="flex-1 min-w-[150px]">
              <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
              <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }} className="input-field text-sm">
                <option value="all">All Status</option>
                <option value="approved">Approved</option>
                <option value="pending">Pending</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="table-container">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-900">
              <th className="table-header">Date</th>
              <th className="table-header">Shop</th>
              <th className="table-header">Category</th>
              <th className="table-header">Description</th>
              <th className="table-header">Vendor</th>
              <th className="table-header">Amount</th>
              <th className="table-header">Status</th>
              <th className="table-header text-right">Actions</th>
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
            ) : expenses.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-12 text-gray-400">
                  <FiDollarSign className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No expenses found</p>
                </td>
              </tr>
            ) : (
              expenses.map(e => (
                <tr key={e._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <td className="table-cell text-xs"><FiCalendar className="w-3 h-3 inline mr-1 text-gray-400" />{new Date(e.date).toLocaleDateString('en-IN')}</td>
                  <td className="table-cell">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      e.shopId ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                    }`}>
                      {getShopName(e.shopId)}
                    </span>
                  </td>
                  <td className="table-cell"><span className="text-xs capitalize">{e.category?.replace(/_/g, ' ')}</span></td>
                  <td className="table-cell text-sm max-w-[200px] truncate" title={e.description}>{e.description}</td>
                  <td className="table-cell text-xs">{e.vendor || '-'}</td>
                  <td className="table-cell font-medium">₹{(e.amount || 0).toLocaleString('en-IN')}</td>
                  <td className="table-cell">
                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                      e.status === 'approved' ? 'badge-success' : e.status === 'pending' ? 'badge-warning' : 'badge-danger'
                    }`}>{e.status}</span>
                  </td>
                  <td className="table-cell text-right">
                    <div className="flex items-center justify-end gap-1">
                      {e.status === 'pending' && (
                        <button onClick={() => handleApprove(e._id)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-success-500 transition-colors" title="Approve">
                          <FiCheck className="w-4 h-4" />
                        </button>
                      )}
                      <button onClick={() => { setEditExpense(e); setShowModal(true); }} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-primary-500 transition-colors" title="Edit">
                        <FiEdit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(e._id)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-danger-400 transition-colors" title="Delete">
                        <FiTrash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-4">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="btn-secondary text-sm px-3 disabled:opacity-50">
            Previous
          </button>
          <span className="text-sm text-gray-500 dark:text-gray-400">Page {page} of {pages}</span>
          <button disabled={page >= pages} onClick={() => setPage(p => p + 1)} className="btn-secondary text-sm px-3 disabled:opacity-50">
            Next
          </button>
        </div>
      )}

      <ExpenseModal isOpen={showModal} onClose={() => { setShowModal(false); setEditExpense(null); }} expense={editExpense} onSaved={load} shops={shops} />
    </div>
  );
}
