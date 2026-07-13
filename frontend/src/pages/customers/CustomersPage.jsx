import React, { useState, useEffect, useCallback } from 'react';
import { FiPlus, FiSearch, FiEdit2, FiTrash2, FiUsers, FiStar, FiCreditCard, FiX, FiRefreshCw } from 'react-icons/fi';
import { apiService } from '../../services/api';
import toast from 'react-hot-toast';

function CustomerModal({ isOpen, onClose, customer, onSave }) {
  const [form, setForm] = useState({ name: '', mobile: '', email: '', gstin: '', address: { city: '', state: '' }, creditLimit: 0, notes: '' });

  useEffect(() => {
    if (customer) setForm({ name: customer.name || '', mobile: customer.mobile || '', email: customer.email || '', gstin: customer.gstin || '', address: customer.address || { city: '', state: '' }, creditLimit: customer.creditLimit || 0, notes: customer.notes || '' });
    else setForm({ name: '', mobile: '', email: '', gstin: '', address: { city: '', state: '' }, creditLimit: 0, notes: '' });
  }, [customer, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (customer) await apiService.updateCustomer(customer._id, form);
      else await apiService.createCustomer(form);
      toast.success(customer ? 'Customer updated' : 'Customer created');
      onSave(); onClose();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to save'); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content max-w-lg" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b"><h3 className="text-lg font-semibold">{customer ? 'Edit Customer' : 'New Customer'}</h3><button onClick={onClose} className="p-1 rounded hover:bg-gray-100"><FiX /></button></div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2"><label className="block text-sm font-medium mb-1">Name *</label><input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="input-field" required /></div>
            <div><label className="block text-sm font-medium mb-1">Mobile *</label><input value={form.mobile} onChange={e => setForm(f => ({ ...f, mobile: e.target.value }))} className="input-field" required /></div>
            <div><label className="block text-sm font-medium mb-1">Email</label><input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="input-field" /></div>
            <div><label className="block text-sm font-medium mb-1">GSTIN</label><input value={form.gstin} onChange={e => setForm(f => ({ ...f, gstin: e.target.value }))} className="input-field" /></div>
            <div><label className="block text-sm font-medium mb-1">Credit Limit</label><input type="number" value={form.creditLimit} onChange={e => setForm(f => ({ ...f, creditLimit: parseFloat(e.target.value) || 0 }))} className="input-field" /></div>
            <div><label className="block text-sm font-medium mb-1">City</label><input value={form.address.city} onChange={e => setForm(f => ({ ...f, address: { ...f.address, city: e.target.value } }))} className="input-field" /></div>
            <div><label className="block text-sm font-medium mb-1">State</label><input value={form.address.state} onChange={e => setForm(f => ({ ...f, address: { ...f.address, state: e.target.value } }))} className="input-field" /></div>
            <div className="col-span-2"><label className="block text-sm font-medium mb-1">Notes</label><textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="input-field" rows={2} /></div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t"><button type="button" onClick={onClose} className="btn-secondary">Cancel</button><button type="submit" className="btn-primary">{customer ? 'Update' : 'Create'} Customer</button></div>
        </form>
      </div>
    </div>
  );
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const limit = 25;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiService.getCustomers({ page, limit, search: search || undefined });
      setCustomers(res.data?.data || []); setTotal(res.data?.pagination?.total || 0);
    } catch (err) { toast.error('Failed to load'); } finally { setLoading(false); }
  }, [page, search]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id) => {
    if (!window.confirm('Deactivate this customer?')) return;
    try { await apiService.deleteCustomer(id); toast.success('Deactivated'); load(); } catch (err) { toast.error('Failed'); }
  };

  const pages = Math.ceil(total / limit);

  return (
    <div className="page-container">
      <div className="page-header">
        <div><h1 className="text-2xl font-bold">Customers</h1><p className="text-sm text-gray-500 mt-1">{total} total customers</p></div>
        <button onClick={() => { setEditing(null); setModalOpen(true); }} className="btn-primary flex items-center gap-2"><FiPlus className="w-4 h-4" />Add Customer</button>
      </div>
      <div className="mb-4 relative"><FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /><input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search by name, mobile, email..." className="input-field pl-9 py-2.5" /></div>
      <div className="table-container">
        <table className="w-full">
          <thead><tr className="bg-gray-50 dark:bg-gray-900">
            <th className="table-header">Customer</th><th className="table-header">Mobile</th><th className="table-header">GSTIN</th><th className="table-header">Orders</th><th className="table-header">Total Spent</th><th className="table-header">Loyalty</th><th className="table-header">Credit</th><th className="table-header text-right">Actions</th>
          </tr></thead>
          <tbody className="divide-y dark:divide-gray-700">
            {loading ? Array.from({ length: 8 }).map((_, i) => (<tr key={i}>{Array.from({ length: 8 }).map((_, j) => (<td key={j} className="table-cell"><div className="h-5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" /></td>))}</tr>))
            : customers.length === 0 ? <tr><td colSpan={8} className="text-center py-12 text-gray-400"><FiUsers className="w-12 h-12 mx-auto mb-3 opacity-30" /><p>No customers found</p></td></tr>
            : customers.map(c => (<tr key={c._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
              <td className="table-cell"><p className="font-medium">{c.name}</p><p className="text-xs text-gray-500">{c.customerId}</p></td>
              <td className="table-cell">{c.mobile}</td>
              <td className="table-cell text-xs font-mono">{c.gstin || '-'}</td>
              <td className="table-cell">{c.totalOrders || 0}</td>
              <td className="table-cell font-medium">₹{(c.totalSpent || 0).toLocaleString('en-IN')}</td>
              <td className="table-cell"><span className="badge-info">{c.loyalty?.points || 0} pts</span><br /><span className="text-xs text-gray-500 capitalize">{c.loyalty?.tier || 'silver'}</span></td>
              <td className="table-cell">{c.creditBalance > 0 ? <span className="text-warning-600">₹{c.creditBalance}</span> : '-'}</td>
              <td className="table-cell text-right"><div className="flex justify-end gap-1">
                <button onClick={() => { setEditing(c); setModalOpen(true); }} className="p-1.5 rounded hover:bg-gray-100 text-gray-400"><FiEdit2 className="w-4 h-4" /></button>
                <button onClick={() => handleDelete(c._id)} className="p-1.5 rounded hover:bg-danger-50 text-gray-400 hover:text-danger-500"><FiTrash2 className="w-4 h-4" /></button>
              </div></td>
            </tr>))}
          </tbody>
        </table>
      </div>
      {pages > 1 && <div className="flex justify-center gap-2 mt-4"><button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="btn-secondary text-sm px-3">Prev</button><span className="flex items-center text-sm text-gray-500 px-3">Page {page} of {pages}</span><button disabled={page >= pages} onClick={() => setPage(p => p + 1)} className="btn-secondary text-sm px-3">Next</button></div>}
      <CustomerModal isOpen={modalOpen} onClose={() => setModalOpen(false)} customer={editing} onSave={load} />
    </div>
  );
}
