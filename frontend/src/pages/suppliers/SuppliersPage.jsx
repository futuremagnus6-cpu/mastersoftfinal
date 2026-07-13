import React, { useState, useEffect, useCallback } from 'react';
import { FiSearch, FiPlus, FiTruck, FiRefreshCw, FiX, FiEdit2, FiTrash2, FiPhone, FiMail, FiMapPin, FiDollarSign } from 'react-icons/fi';
import { apiService } from '../../services/api';
import toast from 'react-hot-toast';

function SupplierModal({ isOpen, onClose, supplier, onSaved }) {
  const [form, setForm] = useState({ name: '', company: '', mobile: '', email: '', gstin: '', pan: '', address: { line1: '', city: '', state: '', pincode: '' }, creditLimit: 0, paymentTerms: 'immediate', notes: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (supplier) {
      setForm({
        name: supplier.name, company: supplier.company || '', mobile: supplier.mobile, email: supplier.email || '',
        gstin: supplier.gstin || '', pan: supplier.pan || '', address: supplier.address || { line1: '', city: '', state: '', pincode: '' },
        creditLimit: supplier.creditLimit || 0, paymentTerms: supplier.paymentTerms || 'immediate', notes: supplier.notes || '',
      });
    } else {
      setForm({ name: '', company: '', mobile: '', email: '', gstin: '', pan: '', address: { line1: '', city: '', state: '', pincode: '' }, creditLimit: 0, paymentTerms: 'immediate', notes: '' });
    }
  }, [supplier, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.mobile) { toast.error('Name and mobile required'); return; }
    setSaving(true);
    try {
      if (supplier) await apiService.updateSupplier(supplier._id, form);
      else await apiService.createSupplier(form);
      toast.success(supplier ? 'Supplier updated' : 'Supplier created');
      onSaved?.(); onClose();
    } catch (err) { toast.error('Failed to save'); } finally { setSaving(false); }
  };

  if (!isOpen) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white dark:bg-gray-800"><h3 className="font-semibold">{supplier ? 'Edit' : 'New'} Supplier</h3><button onClick={onClose} className="p-1 rounded hover:bg-gray-100"><FiX /></button></div>
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs font-medium block mb-1">Name *</label><input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="input-field text-sm" required /></div>
            <div><label className="text-xs font-medium block mb-1">Company</label><input type="text" value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} className="input-field text-sm" /></div>
            <div><label className="text-xs font-medium block mb-1">Mobile *</label><input type="text" value={form.mobile} onChange={e => setForm(f => ({ ...f, mobile: e.target.value }))} className="input-field text-sm" required /></div>
            <div><label className="text-xs font-medium block mb-1">Email</label><input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="input-field text-sm" /></div>
            <div><label className="text-xs font-medium block mb-1">GSTIN</label><input type="text" value={form.gstin} onChange={e => setForm(f => ({ ...f, gstin: e.target.value }))} className="input-field text-sm" /></div>
            <div><label className="text-xs font-medium block mb-1">PAN</label><input type="text" value={form.pan} onChange={e => setForm(f => ({ ...f, pan: e.target.value }))} className="input-field text-sm" /></div>
          </div>
          <div><label className="text-xs font-medium block mb-1">Address</label>
            <div className="grid grid-cols-2 gap-2">
              <input type="text" value={form.address.line1} onChange={e => setForm(f => ({ ...f, address: { ...f.address, line1: e.target.value } }))} placeholder="Line 1" className="input-field text-sm col-span-2" />
              <input type="text" value={form.address.city} onChange={e => setForm(f => ({ ...f, address: { ...f.address, city: e.target.value } }))} placeholder="City" className="input-field text-sm" />
              <input type="text" value={form.address.state} onChange={e => setForm(f => ({ ...f, address: { ...f.address, state: e.target.value } }))} placeholder="State" className="input-field text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs font-medium block mb-1">Credit Limit</label><input type="number" value={form.creditLimit} onChange={e => setForm(f => ({ ...f, creditLimit: parseFloat(e.target.value) || 0 }))} className="input-field text-sm" /></div>
            <div><label className="text-xs font-medium block mb-1">Payment Terms</label>
              <select value={form.paymentTerms} onChange={e => setForm(f => ({ ...f, paymentTerms: e.target.value }))} className="input-field text-sm">
                <option value="immediate">Immediate</option><option value="7_days">7 Days</option><option value="15_days">15 Days</option><option value="30_days">30 Days</option><option value="45_days">45 Days</option><option value="60_days">60 Days</option>
              </select>
            </div>
          </div>
          <div><label className="text-xs font-medium block mb-1">Notes</label><textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="input-field text-sm w-full" rows={2} /></div>
          <div className="flex gap-3 pt-4 border-t"><button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button><button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Saving...' : 'Save'}</button></div>
        </form>
      </div>
    </div>
  );
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [editSupplier, setEditSupplier] = useState(null);
  const limit = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit };
      if (search) params.search = search;
      const res = await apiService.getSuppliers(params);
      setSuppliers(res.data?.data || []);
      setTotal(res.data?.pagination?.total || 0);
    } catch (err) { toast.error('Failed to load'); } finally { setLoading(false); }
  }, [page, search]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this supplier?')) return;
    try { await apiService.deleteSupplier(id); toast.success('Deleted'); load(); } catch (err) { toast.error('Failed'); }
  };

  const pages = Math.ceil(total / limit);

  return (
    <div className="page-container">
      <div className="page-header">
        <div><h1 className="text-2xl font-bold">Suppliers</h1><p className="text-sm text-gray-500 mt-1">{total} total suppliers</p></div>
        <button onClick={() => { setEditSupplier(null); setShowModal(true); }} className="btn-primary flex items-center gap-2"><FiPlus className="w-4 h-4" /> Add Supplier</button>
      </div>
      <div className="mb-4 flex gap-3">
        <div className="relative flex-1"><FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search by name, company, mobile..." className="input-field pl-9 py-2" /></div>
        <button onClick={load} disabled={loading} className="btn-secondary flex items-center gap-2"><FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh</button>
      </div>
      <div className="table-container">
        <table className="w-full">
          <thead><tr className="bg-gray-50 dark:bg-gray-900">
            <th className="table-header">Name</th><th className="table-header">Company</th><th className="table-header">Mobile</th><th className="table-header">Email</th><th className="table-header">City</th><th className="table-header">Credit</th><th className="table-header text-right">Action</th>
          </tr></thead>
          <tbody className="divide-y">
            {loading ? Array.from({ length: 5 }).map((_, i) => (<tr key={i}>{Array.from({ length: 7 }).map((_, j) => (<td key={j} className="table-cell"><div className="h-5 bg-gray-200 rounded animate-pulse" /></td>))}</tr>))
            : suppliers.length === 0 ? <tr><td colSpan={7} className="text-center py-12 text-gray-400"><FiTruck className="w-12 h-12 mx-auto mb-3 opacity-30" /><p>No suppliers found</p></td></tr>
            : suppliers.map(s => (<tr key={s._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
              <td className="table-cell font-medium">{s.name}</td>
              <td className="table-cell text-sm">{s.company || '-'}</td>
              <td className="table-cell text-xs">{s.mobile}</td>
              <td className="table-cell text-xs">{s.email || '-'}</td>
              <td className="table-cell text-xs">{s.address?.city || '-'}</td>
              <td className="table-cell text-xs">₹{(s.creditLimit || 0).toLocaleString('en-IN')}</td>
              <td className="table-cell text-right">
                <div className="flex items-center justify-end gap-1">
                  <button onClick={() => { setEditSupplier(s); setShowModal(true); }} className="p-1.5 rounded hover:bg-gray-100 text-primary-500"><FiEdit2 className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(s._id)} className="p-1.5 rounded hover:bg-gray-100 text-danger-400"><FiTrash2 className="w-4 h-4" /></button>
                </div>
              </td>
            </tr>))}
          </tbody>
        </table>
      </div>
      {pages > 1 && <div className="flex justify-center gap-2 mt-4"><button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="btn-secondary text-sm px-3">Prev</button><span className="flex items-center text-sm text-gray-500 px-3">Page {page} of {pages}</span><button disabled={page >= pages} onClick={() => setPage(p => p + 1)} className="btn-secondary text-sm px-3">Next</button></div>}
      <SupplierModal isOpen={showModal} onClose={() => { setShowModal(false); setEditSupplier(null); }} supplier={editSupplier} onSaved={load} />
    </div>
  );
}
