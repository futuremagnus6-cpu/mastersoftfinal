import React, { useState, useEffect, useCallback } from 'react';
import { FiSearch, FiPlus, FiTruck, FiRefreshCw, FiX, FiEdit2, FiTrash2, FiPhone, FiMail, FiMapPin, FiDollarSign } from 'react-icons/fi';
import { apiService } from '../../services/api';
import toast from 'react-hot-toast';
import FormField from '../../components/form/FormField';

function SupplierModal({ isOpen, onClose, supplier, onSaved }) {
  const [form, setForm] = useState({ name: '', company: '', mobile: '', email: '', gstin: '', pan: '', address: { line1: '', city: '', state: '', pincode: '' }, creditLimit: 0, paymentTerms: 'immediate', sendEmailNotifications: true, notes: '' });
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (supplier) {
      setForm({
        name: supplier.name, company: supplier.company || '', mobile: supplier.mobile, email: supplier.email || '',
        gstin: supplier.gstin || '', pan: supplier.pan || '', address: supplier.address || { line1: '', city: '', state: '', pincode: '' },
        creditLimit: supplier.creditLimit || 0, paymentTerms: supplier.paymentTerms || 'immediate', sendEmailNotifications: supplier.sendEmailNotifications !== false, notes: supplier.notes || '',
      });
    } else {
      setForm({ name: '', company: '', mobile: '', email: '', gstin: '', pan: '', address: { line1: '', city: '', state: '', pincode: '' }, creditLimit: 0, paymentTerms: 'immediate', sendEmailNotifications: true, notes: '' });
    }
    setFormErrors({});
  }, [supplier, isOpen]);

  const validate = () => {
    const errors = {};
    if (!form.name.trim()) errors.name = 'Name is required';
    if (!form.mobile.trim()) errors.mobile = 'Mobile is required';
    else if (!/^\d{10,15}$/.test(form.mobile.replace(/[+\-\s]/g, ''))) errors.mobile = 'Invalid mobile number';
    if (form.email && !/\S+@\S+\.\S+/.test(form.email)) errors.email = 'Invalid email format';
    if (form.gstin && !/^[0-9A-Z]{15}$/.test(form.gstin)) errors.gstin = 'GSTIN must be 15 characters';
    if (form.pan && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(form.pan)) errors.pan = 'Invalid PAN format';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChange = (field, value) => {
    setForm(f => ({ ...f, [field]: value }));
    if (formErrors[field]) setFormErrors(prev => ({ ...prev, [field]: '' }));
  };

  const handleNestedChange = (parent, field, value) => {
    setForm(f => ({ ...f, [parent]: { ...f[parent], [field]: value } }));
    const key = `${parent}.${field}`;
    if (formErrors[key]) setFormErrors(prev => ({ ...prev, [key]: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      if (supplier) await apiService.updateSupplier(supplier._id, form);
      else await apiService.createSupplier(form);
      toast.success(supplier ? 'Supplier updated' : 'Supplier created');
      onSaved?.(); onClose();
    } catch (err) {
      const data = err.response?.data;
      if (data?.code === 'VALIDATION_ERROR' && data?.errors) {
        const fieldErrors = {};
        const fieldMap = { orderDate: 'invoiceDate' };
        data.errors.forEach(e => {
          const frontendField = fieldMap[e.field] || e.field;
          fieldErrors[frontendField] = e.message;
        });
        setFormErrors(fieldErrors);
        toast.error('Please fix the highlighted fields');
      } else {
        toast.error(data?.message || 'Failed to save');
      }
    } finally { setSaving(false); }
  };

  if (!isOpen) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white dark:bg-gray-800"><h3 className="font-semibold">{supplier ? 'Edit' : 'New'} Supplier</h3><button onClick={onClose} className="p-1 rounded hover:bg-gray-100"><FiX /></button></div>
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Name" error={formErrors.name} required><input type="text" value={form.name} onChange={e => handleChange('name', e.target.value)} className={`input-field text-sm ${formErrors.name ? 'input-error' : ''}`} /></FormField>
            <FormField label="Company" error={formErrors.company}><input type="text" value={form.company} onChange={e => handleChange('company', e.target.value)} className={`input-field text-sm ${formErrors.company ? 'input-error' : ''}`} /></FormField>
            <FormField label="Mobile" error={formErrors.mobile} required><input type="text" value={form.mobile} onChange={e => handleChange('mobile', e.target.value)} className={`input-field text-sm ${formErrors.mobile ? 'input-error' : ''}`} /></FormField>
            <FormField label="Email" error={formErrors.email}><input type="email" value={form.email} onChange={e => handleChange('email', e.target.value)} className={`input-field text-sm ${formErrors.email ? 'input-error' : ''}`} /></FormField>
            <FormField label="GSTIN" error={formErrors.gstin}><input type="text" value={form.gstin} onChange={e => handleChange('gstin', e.target.value)} className={`input-field text-sm ${formErrors.gstin ? 'input-error' : ''}`} /></FormField>
            <FormField label="PAN" error={formErrors.pan}><input type="text" value={form.pan} onChange={e => handleChange('pan', e.target.value)} className={`input-field text-sm ${formErrors.pan ? 'input-error' : ''}`} /></FormField>
          </div>
          <FormField label="Address" error={formErrors['address.line1'] || formErrors['address.city']}>
            <div className="grid grid-cols-2 gap-2">
              <input type="text" value={form.address.line1} onChange={e => handleNestedChange('address', 'line1', e.target.value)} placeholder="Line 1" className={`input-field text-sm col-span-2 ${formErrors['address.line1'] ? 'input-error' : ''}`} />
              <input type="text" value={form.address.city} onChange={e => handleNestedChange('address', 'city', e.target.value)} placeholder="City" className={`input-field text-sm ${formErrors['address.city'] ? 'input-error' : ''}`} />
              <input type="text" value={form.address.state} onChange={e => handleNestedChange('address', 'state', e.target.value)} placeholder="State" className="input-field text-sm" />
            </div>
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Credit Limit" error={formErrors.creditLimit}><input type="number" value={form.creditLimit} onChange={e => handleChange('creditLimit', parseFloat(e.target.value) || 0)} className={`input-field text-sm ${formErrors.creditLimit ? 'input-error' : ''}`} /></FormField>
            <FormField label="Payment Terms" error={formErrors.paymentTerms}>
              <select value={form.paymentTerms} onChange={e => handleChange('paymentTerms', e.target.value)} className={`input-field text-sm ${formErrors.paymentTerms ? 'input-error' : ''}`}>
                <option value="immediate">Immediate</option><option value="7_days">7 Days</option><option value="15_days">15 Days</option><option value="30_days">30 Days</option><option value="45_days">45 Days</option><option value="60_days">60 Days</option>
              </select>
            </FormField>
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <div>
              <label className="text-xs font-medium block">Send Email Notifications</label>
              <p className="text-[10px] text-gray-400 mt-0.5">Receive purchase order updates via email</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={form.sendEmailNotifications} onChange={e => setForm(f => ({ ...f, sendEmailNotifications: e.target.checked }))} className="sr-only peer" />
              <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-500 peer-checked:bg-primary-600" />
            </label>
          </div>
          <FormField label="Notes" error={formErrors.notes}><textarea value={form.notes} onChange={e => handleChange('notes', e.target.value)} className={`input-field text-sm w-full ${formErrors.notes ? 'input-error' : ''}`} rows={2} /></FormField>
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
