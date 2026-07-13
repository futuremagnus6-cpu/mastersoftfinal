import React, { useState, useEffect, useCallback } from 'react';
import { FiSearch, FiPlus, FiDollarSign, FiRefreshCw, FiX, FiEdit2, FiTrash2, FiCheck, FiX as FiXCircle } from 'react-icons/fi';
import { apiService } from '../../services/api';
import toast from 'react-hot-toast';

const categories = ['rent', 'salary', 'marketing', 'electricity', 'internet', 'maintenance', 'transport', 'packaging', 'utilities', 'insurance', 'taxes', 'professional_fees', 'office_supplies', 'staff_welfare', 'depreciation', 'miscellaneous'];

function ExpenseModal({ isOpen, onClose, expense, onSaved }) {
  const [form, setForm] = useState({ category: 'miscellaneous', amount: 0, description: '', date: new Date().toISOString().split('T')[0], paymentMethod: 'cash', reference: '', vendor: '', notes: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (expense) setForm({ category: expense.category, amount: expense.amount, description: expense.description, date: new Date(expense.date).toISOString().split('T')[0], paymentMethod: expense.paymentMethod, reference: expense.reference || '', vendor: expense.vendor || '', notes: expense.notes || '' });
    else setForm({ category: 'miscellaneous', amount: 0, description: '', date: new Date().toISOString().split('T')[0], paymentMethod: 'cash', reference: '', vendor: '', notes: '' });
  }, [expense, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.description || !form.amount || form.amount <= 0) { toast.error('Description and valid amount required'); return; }
    setSaving(true);
    try {
      if (expense) await apiService.updateExpense(expense._id, form);
      else await apiService.createExpense(form);
      toast.success(expense ? 'Expense updated' : 'Expense created');
      onSaved?.(); onClose();
    } catch (err) { toast.error('Failed to save'); } finally { setSaving(false); }
  };

  if (!isOpen) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b"><h3 className="font-semibold">{expense ? 'Edit' : 'New'} Expense</h3><button onClick={onClose} className="p-1 rounded hover:bg-gray-100"><FiX /></button></div>
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
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
          <div className="flex gap-3 pt-4 border-t"><button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button><button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Saving...' : expense ? 'Update' : 'Create'}</button></div>
        </form>
      </div>
    </div>
  );
}

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [editExpense, setEditExpense] = useState(null);
  const limit = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit, sort: '-date' };
      if (search) params.search = search;
      const res = await apiService.getExpenses(params);
      setExpenses(res.data?.data || []);
      setTotal(res.data?.pagination?.total || 0);
    } catch (err) { toast.error('Failed to load'); } finally { setLoading(false); }
  }, [page, search]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this expense?')) return;
    try { await apiService.deleteExpense(id); toast.success('Deleted'); load(); } catch (err) { toast.error('Failed to delete'); }
  };

  const handleApprove = async (id) => {
    try { await apiService.approveExpense(id); toast.success('Approved'); load(); } catch (err) { toast.error('Failed to approve'); }
  };

  const totalAmount = expenses.reduce((s, e) => s + (e.amount || 0), 0);
  const pages = Math.ceil(total / limit);

  return (
    <div className="page-container">
      <div className="page-header">
        <div><h1 className="text-2xl font-bold">Expenses</h1><p className="text-sm text-gray-500 mt-1">{total} total expenses · ₹{totalAmount.toLocaleString('en-IN')}</p></div>
        <button onClick={() => { setEditExpense(null); setShowModal(true); }} className="btn-primary flex items-center gap-2"><FiPlus className="w-4 h-4" /> New Expense</button>
      </div>
      <div className="mb-4 flex gap-3">
        <div className="relative flex-1"><FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search expenses..." className="input-field pl-9 py-2" /></div>
        <button onClick={load} disabled={loading} className="btn-secondary flex items-center gap-2"><FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh</button>
      </div>
      <div className="table-container">
        <table className="w-full">
          <thead><tr className="bg-gray-50 dark:bg-gray-900">
            <th className="table-header">Date</th><th className="table-header">Category</th><th className="table-header">Description</th><th className="table-header">Vendor</th><th className="table-header">Amount</th><th className="table-header">Payment</th><th className="table-header">Status</th><th className="table-header text-right">Action</th>
          </tr></thead>
          <tbody className="divide-y">
            {loading ? Array.from({ length: 5 }).map((_, i) => (<tr key={i}>{Array.from({ length: 8 }).map((_, j) => (<td key={j} className="table-cell"><div className="h-5 bg-gray-200 rounded animate-pulse" /></td>))}</tr>))
            : expenses.length === 0 ? <tr><td colSpan={8} className="text-center py-12 text-gray-400"><FiDollarSign className="w-12 h-12 mx-auto mb-3 opacity-30" /><p>No expenses found</p></td></tr>
            : expenses.map(e => (<tr key={e._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
              <td className="table-cell text-xs">{new Date(e.date).toLocaleDateString('en-IN')}</td>
              <td className="table-cell"><span className="text-xs capitalize">{e.category?.replace(/_/g, ' ')}</span></td>
              <td className="table-cell text-sm">{e.description}</td>
              <td className="table-cell text-xs">{e.vendor || '-'}</td>
              <td className="table-cell font-medium">₹{(e.amount || 0).toLocaleString('en-IN')}</td>
              <td className="table-cell text-xs capitalize">{e.paymentMethod?.replace(/_/g, ' ')}</td>
              <td className="table-cell"><span className={e.status === 'approved' ? 'badge-success' : e.status === 'pending' ? 'badge-warning' : 'badge-danger'}>{e.status}</span></td>
              <td className="table-cell text-right">
                <div className="flex items-center justify-end gap-1">
                  {e.status === 'pending' && <button onClick={() => handleApprove(e._id)} className="p-1.5 rounded hover:bg-gray-100 text-success-500"><FiCheck className="w-4 h-4" /></button>}
                  <button onClick={() => { setEditExpense(e); setShowModal(true); }} className="p-1.5 rounded hover:bg-gray-100 text-primary-500"><FiEdit2 className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(e._id)} className="p-1.5 rounded hover:bg-gray-100 text-danger-400"><FiTrash2 className="w-4 h-4" /></button>
                </div>
              </td>
            </tr>))}
          </tbody>
        </table>
      </div>
      {pages > 1 && <div className="flex justify-center gap-2 mt-4"><button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="btn-secondary text-sm px-3">Prev</button><span className="flex items-center text-sm text-gray-500 px-3">Page {page} of {pages}</span><button disabled={page >= pages} onClick={() => setPage(p => p + 1)} className="btn-secondary text-sm px-3">Next</button></div>}
      <ExpenseModal isOpen={showModal} onClose={() => { setShowModal(false); setEditExpense(null); }} expense={editExpense} onSaved={load} />
    </div>
  );
}
