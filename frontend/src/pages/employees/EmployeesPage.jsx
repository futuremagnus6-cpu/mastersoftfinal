import React, { useState, useEffect, useCallback } from 'react';
import { FiSearch, FiPlus, FiUsers, FiRefreshCw, FiX, FiEdit2, FiTrash2, FiPhone, FiMail, FiMapPin, FiKey, FiStar, FiShield } from 'react-icons/fi';
import { apiService } from '../../services/api';
import toast from 'react-hot-toast';

const departments = ['Sales', 'Operations', 'Accounts', 'Inventory', 'Management', 'IT', 'HR', 'Customer Service', 'Marketing', 'Other'];
const userRoles = [
  { value: 'staff', label: 'Staff', description: 'Basic POS and order access' },
  { value: 'manager', label: 'Manager', description: 'Can manage employees, products, and reports' },
  { value: 'shop_admin', label: 'Shop Admin', description: 'Full shop-level access' },
];

function EmployeeModal({ isOpen, onClose, employee, onSaved }) {
  const [form, setForm] = useState({
    name: '', mobile: '', email: '', employeeCode: '',
    department: '', designation: '', doj: new Date().toISOString().split('T')[0],
    gender: '', salary: { basic: 0, grossSalary: 0, netSalary: 0 },
    address: { city: '' }, isActive: true,
    hasLogin: false, loginEmail: '', password: '', userRole: 'staff', priority: 0,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (employee) {
      setForm({
        name: employee.name, mobile: employee.mobile, email: employee.email || '',
        employeeCode: employee.employeeCode,
        department: employee.department || '', designation: employee.designation || '',
        doj: new Date(employee.doj).toISOString().split('T')[0],
        gender: employee.gender || '',
        salary: employee.salary || { basic: 0, grossSalary: 0, netSalary: 0 },
        address: employee.address || { city: '' }, isActive: employee.isActive,
        hasLogin: employee.hasLogin || false,
        loginEmail: employee.loginEmail || '',
        password: '',
        userRole: employee.userRole || 'staff',
        priority: employee.priority || 0,
      });
    } else {
      setForm({
        name: '', mobile: '', email: '',
        employeeCode: `EMP-${Date.now().toString(36).toUpperCase()}`, department: '',
        designation: '', doj: new Date().toISOString().split('T')[0],
        gender: '', salary: { basic: 0, grossSalary: 0, netSalary: 0 },
        address: { city: '' }, isActive: true,
        hasLogin: false, loginEmail: '', password: '', userRole: 'staff', priority: 0,
      });
    }
  }, [employee, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.mobile) { toast.error('Name and mobile required'); return; }
    if (form.hasLogin && !form.loginEmail) { toast.error('Login email is required when login is enabled'); return; }
    setSaving(true);
    try {
      const payload = { ...form };
      // Only send password if it's set (don't overwrite on edit if empty)
      if (employee && !payload.password) delete payload.password;
      // Remove empty-string enum fields so Mongoose doesn't reject them
      if (!payload.gender) delete payload.gender;
      if (employee) await apiService.updateEmployee(employee._id, payload);
      else await apiService.createEmployee(payload);
      toast.success(employee ? 'Employee updated' : 'Employee created');
      onSaved?.(); onClose();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to save'); } finally { setSaving(false); }
  };

  if (!isOpen) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white dark:bg-gray-800"><h3 className="font-semibold">{employee ? 'Edit' : 'New'} Employee</h3><button onClick={onClose} className="p-1 rounded hover:bg-gray-100"><FiX /></button></div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Basic Info */}
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Basic Information</h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><label className="block text-xs font-medium mb-1">Name *</label><input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="input-field text-sm" required /></div>
            <div><label className="block text-xs font-medium mb-1">Employee Code</label><input type="text" value={form.employeeCode} onChange={e => setForm(f => ({ ...f, employeeCode: e.target.value }))} className="input-field text-sm" /></div>
            <div><label className="block text-xs font-medium mb-1">Mobile *</label><input type="text" value={form.mobile} onChange={e => setForm(f => ({ ...f, mobile: e.target.value }))} className="input-field text-sm" required /></div>
            <div><label className="block text-xs font-medium mb-1">Email</label><input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="input-field text-sm" /></div>
            <div><label className="block text-xs font-medium mb-1">Department</label>
              <select value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} className="input-field text-sm">
                <option value="">Select</option>
                {departments.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div><label className="block text-xs font-medium mb-1">Designation</label><input type="text" value={form.designation} onChange={e => setForm(f => ({ ...f, designation: e.target.value }))} className="input-field text-sm" /></div>
            <div><label className="block text-xs font-medium mb-1">Date of Joining</label><input type="date" value={form.doj} onChange={e => setForm(f => ({ ...f, doj: e.target.value }))} className="input-field text-sm" /></div>
            <div><label className="block text-xs font-medium mb-1">City</label><input type="text" value={form.address.city} onChange={e => setForm(f => ({ ...f, address: { ...f.address, city: e.target.value } }))} className="input-field text-sm" /></div>
          </div>

          {/* Login Credentials */}
          <hr className="dark:border-gray-700" />
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1">
              <FiKey className="w-3 h-3" /> Login Access
            </h4>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={form.hasLogin} onChange={e => setForm(f => ({ ...f, hasLogin: e.target.checked }))} className="sr-only peer" />
              <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
            </label>
          </div>
          {form.hasLogin && (
            <div className="p-3 bg-primary-50 dark:bg-primary-900/10 border border-primary-200 dark:border-primary-800 rounded-lg space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-medium mb-1">Login Email *</label>
                  <div className="relative">
                    <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input type="email" value={form.loginEmail} onChange={e => setForm(f => ({ ...f, loginEmail: e.target.value }))} className="input-field text-sm pl-9" placeholder="employee@shop.com" required />
                  </div>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium mb-1">
                    {employee ? 'New Password (leave blank to keep current)' : 'Password *'}
                  </label>
                  <input type="text" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} className="input-field text-sm" placeholder={employee ? 'Leave blank to keep current' : 'Default: Employee@123'} />
                  <p className="text-[10px] text-gray-400 mt-0.5">Default password: Employee@123</p>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Role</label>
                  <select value={form.userRole} onChange={e => setForm(f => ({ ...f, userRole: e.target.value }))} className="input-field text-sm">
                    {userRoles.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                  <p className="text-[10px] text-gray-400 mt-0.5">{userRoles.find(r => r.value === form.userRole)?.description}</p>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">
                    <FiStar className="w-3 h-3 inline mr-0.5" /> Priority
                  </label>
                  <input type="number" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: parseInt(e.target.value) || 0 }))} className="input-field text-sm" min={0} max={100} />
                  <p className="text-[10px] text-gray-400 mt-0.5">0-100. Higher = more important</p>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? 'Saving...' : employee ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [editEmp, setEditEmp] = useState(null);
  const limit = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit };
      if (search) params.search = search;
      const res = await apiService.getEmployees(params);
      setEmployees(res.data?.data || []);
      setTotal(res.data?.pagination?.total || 0);
    } catch (err) { toast.error('Failed to load'); } finally { setLoading(false); }
  }, [page, search]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this employee?')) return;
    try { await apiService.deleteEmployee(id); toast.success('Deleted'); load(); } catch (err) { toast.error('Failed'); }
  };

  const pages = Math.ceil(total / limit);

  return (
    <div className="page-container">
      <div className="page-header">
        <div><h1 className="text-2xl font-bold">Employees</h1><p className="text-sm text-gray-500 mt-1">{total} total employees</p></div>
        <button onClick={() => { setEditEmp(null); setShowModal(true); }} className="btn-primary flex items-center gap-2"><FiPlus className="w-4 h-4" /> Add Employee</button>
      </div>
      <div className="mb-4 flex gap-3">
        <div className="relative flex-1"><FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search by name, code, department..." className="input-field pl-9 py-2" /></div>
        <button onClick={load} disabled={loading} className="btn-secondary flex items-center gap-2"><FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh</button>
      </div>
      <div className="table-container">
        <table className="w-full">
          <thead><tr className="bg-gray-50 dark:bg-gray-900">
            <th className="table-header">Code</th><th className="table-header">Name</th><th className="table-header">Dept</th><th className="table-header">Mobile</th><th className="table-header">Priority</th><th className="table-header">Login</th><th className="table-header">Status</th><th className="table-header text-right">Action</th>
          </tr></thead>
          <tbody className="divide-y">
            {loading ? Array.from({ length: 5 }).map((_, i) => (<tr key={i}>{Array.from({ length: 8 }).map((_, j) => (<td key={j} className="table-cell"><div className="h-5 bg-gray-200 rounded animate-pulse" /></td>))}</tr>))
            : employees.length === 0 ? <tr><td colSpan={8} className="text-center py-12 text-gray-400"><FiUsers className="w-12 h-12 mx-auto mb-3 opacity-30" /><p>No employees found</p></td></tr>
            : employees.map(e => (<tr key={e._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
              <td className="table-cell font-mono text-xs">{e.employeeCode}</td>
              <td className="table-cell font-medium">
                {e.name}
                {e.userRole && e.hasLogin && <span className="ml-1.5 text-[10px] text-primary-500">({e.userRole})</span>}
              </td>
              <td className="table-cell text-xs">{e.department || '-'}</td>
              <td className="table-cell text-xs">{e.mobile}</td>
              <td className="table-cell">
                <div className="flex items-center gap-1">
                  <FiStar className={`w-3 h-3 ${e.priority > 50 ? 'text-amber-500 fill-amber-500' : 'text-gray-300'}`} />
                  <span className="text-xs">{e.priority || 0}</span>
                </div>
              </td>
              <td className="table-cell">
                {e.hasLogin ? (
                  <span className="badge-success text-xs">
                    <FiShield className="w-3 h-3 inline mr-0.5" />
                    Active
                  </span>
                ) : (
                  <span className="text-xs text-gray-400">No login</span>
                )}
              </td>
              <td className="table-cell"><span className={e.isActive ? 'badge-success' : 'badge-danger'}>{e.isActive ? 'Active' : 'Inactive'}</span></td>
              <td className="table-cell text-right">
                <div className="flex items-center justify-end gap-1">
                  <button onClick={() => { setEditEmp(e); setShowModal(true); }} className="p-1.5 rounded hover:bg-gray-100 text-primary-500"><FiEdit2 className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(e._id)} className="p-1.5 rounded hover:bg-gray-100 text-danger-400"><FiTrash2 className="w-4 h-4" /></button>
                </div>
              </td>
            </tr>))}
          </tbody>
        </table>
      </div>
      {pages > 1 && <div className="flex justify-center gap-2 mt-4"><button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="btn-secondary text-sm px-3">Prev</button><span className="flex items-center text-sm text-gray-500 px-3">Page {page} of {pages}</span><button disabled={page >= pages} onClick={() => setPage(p => p + 1)} className="btn-secondary text-sm px-3">Next</button></div>}
      <EmployeeModal isOpen={showModal} onClose={() => { setShowModal(false); setEditEmp(null); }} employee={editEmp} onSaved={load} />
    </div>
  );
}
