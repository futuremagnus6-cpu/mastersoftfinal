import React, { useState, useEffect, useCallback } from 'react';
import { FiSearch, FiPlus, FiUsers, FiRefreshCw, FiX, FiEdit2, FiTrash2, FiMail, FiShield, FiStar, FiUserCheck, FiKey, FiInfo } from 'react-icons/fi';
import { apiService } from '../../services/api';
import toast from 'react-hot-toast';

const roleOptions = [
  {
    value: 'manager',
    label: 'Manager',
    description: 'Can manage products, orders, customers, inventory, and view reports',
    color: 'badge-info',
  },
  {
    value: 'staff',
    label: 'Staff',
    description: 'Basic POS, product lookup, and order creation access',
    color: 'badge-success',
  },
];

function TeamMemberModal({ isOpen, onClose, member, onSaved }) {
  const [form, setForm] = useState({
    name: '', email: '', phone: '', password: '', role: 'staff',
    isActive: true,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (member) {
      setForm({
        name: member.name || '',
        email: member.email || '',
        phone: member.phone || '',
        password: '',
        role: member.role || 'staff',
        isActive: member.isActive !== false,
      });
    } else {
      setForm({
        name: '', email: '', phone: '', password: '', role: 'staff',
        isActive: true,
      });
    }
  }, [member, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email) {
      toast.error('Name and email are required');
      return;
    }
    if (!member && !form.password) {
      toast.error('Password is required for new members');
      return;
    }

    setSaving(true);
    try {
      const payload = { ...form };
      if (member && !payload.password) delete payload.password;

      if (member) {
        await apiService.updateUser(member._id, payload);
        toast.success('Team member updated');
      } else {
        await apiService.createUser(payload);
        toast.success('Team member added');
      }
      onSaved?.();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white dark:bg-gray-800 z-10">
          <h3 className="font-semibold text-gray-900 dark:text-white">
            {member ? 'Edit Team Member' : 'Add Team Member'}
          </h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400">
            <FiX className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Basic Info */}
          <div>
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Account Information</h4>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="input-field text-sm"
                  placeholder="e.g. Rahul Sharma"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Email Address *</label>
                <div className="relative">
                  <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    className="input-field text-sm pl-9"
                    placeholder="member@shop.com"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Phone Number</label>
                <input
                  type="text"
                  value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  className="input-field text-sm"
                  placeholder="+91 98765 43210"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {member ? 'New Password (leave blank to keep current)' : 'Password *'}
                </label>
                <input
                  type="text"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  className="input-field text-sm"
                  placeholder={member ? 'Leave blank to keep current' : 'Min 6 characters'}
                  required={!member}
                  minLength={member ? 0 : 6}
                />
                {!member && (
                  <p className="text-[10px] text-gray-400 mt-0.5">Minimum 6 characters required</p>
                )}
              </div>
            </div>
          </div>

          {/* Role Selection */}
          <hr className="dark:border-gray-700" />
          <div>
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Role & Permissions</h4>
            <div className="space-y-2">
              {roleOptions.map(role => (
                <label
                  key={role.value}
                  className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                    form.role === role.value
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/10'
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                  }`}
                  onClick={() => setForm(f => ({ ...f, role: role.value }))}
                >
                  <input
                    type="radio"
                    name="role"
                    value={role.value}
                    checked={form.role === role.value}
                    onChange={() => {}}
                    className="mt-0.5"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{role.label}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${role.color}`}>{role.value}</span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{role.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Status Toggle (only for edit) */}
          {member && (
            <>
              <hr className="dark:border-gray-700" />
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">Active Status</span>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Deactivate to prevent login access</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
                </label>
              </div>
            </>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? 'Saving...' : member ? 'Update Member' : 'Add Member'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function TeamPage() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [editMember, setEditMember] = useState(null);
  const limit = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit };
      if (search) params.search = search;
      const res = await apiService.getUsers(params);
      setMembers(res.data?.data || []);
      setTotal(res.data?.pagination?.total || 0);
    } catch (err) {
      toast.error('Failed to load team members');
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id) => {
    if (!window.confirm('Deactivate this team member? They will no longer be able to log in.')) return;
    try {
      await apiService.deleteUser(id);
      toast.success('Team member deactivated');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to deactivate');
    }
  };

  const pages = Math.ceil(total / limit);

  const getRoleBadge = (role) => {
    const badges = {
      manager: 'badge-info',
      staff: 'badge-success',
      shop_admin: 'badge-warning',
      super_admin: 'badge-danger',
    };
    return badges[role] || 'badge-info';
  };

  const getRoleDescription = (role) => {
    const descs = {
      manager: 'Manages products, orders, reports',
      staff: 'Basic POS & order access',
      shop_admin: 'Full shop access',
      super_admin: 'System administrator',
    };
    return descs[role] || '';
  };

  return (
    <div className="page-container">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Team Members</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {total} team member{total !== 1 ? 's' : ''} — Manage login access and roles
          </p>
        </div>
        <button
          onClick={() => { setEditMember(null); setShowModal(true); }}
          className="btn-primary flex items-center gap-2"
        >
          <FiPlus className="w-4 h-4" /> Add Member
        </button>
      </div>

      {/* Search & Filters */}
      <div className="mb-4 flex gap-3">
        <div className="relative flex-1">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by name, email, or phone..."
            className="input-field pl-9 py-2 text-sm w-full"
          />
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="btn-secondary flex items-center gap-2"
        >
          <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Team Members Table */}
      <div className="table-container">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-900">
              <th className="table-header">Member</th>
              <th className="table-header">Role</th>
              <th className="table-header">Permissions</th>
              <th className="table-header">Status</th>
              <th className="table-header">Last Login</th>
              <th className="table-header text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y dark:divide-gray-700">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <td key={j} className="table-cell"><div className="h-5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" /></td>
                  ))}
                </tr>
              ))
            ) : members.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-gray-400">
                  <FiUsers className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm font-medium">No team members found</p>
                  <p className="text-xs mt-1">Add your first team member to get started</p>
                  <button
                    onClick={() => { setEditMember(null); setShowModal(true); }}
                    className="btn-primary text-sm mt-4 inline-flex items-center gap-2"
                  >
                    <FiPlus className="w-4 h-4" /> Add Member
                  </button>
                </td>
              </tr>
            ) : (
              members.map(member => (
                <tr key={member._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <td className="table-cell">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-primary-600 dark:text-primary-400">
                          {member.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?'}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{member.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{member.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="table-cell">
                    <div className="flex flex-col gap-0.5">
                      <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium w-fit ${getRoleBadge(member.role)}`}>
                        {member.role?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </span>
                    </div>
                  </td>
                  <td className="table-cell">
                    <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                      <FiShield className="w-3 h-3" />
                      <span className="truncate max-w-[180px]">{getRoleDescription(member.role)}</span>
                    </div>
                  </td>
                  <td className="table-cell">
                    <span className={member.isActive ? 'badge-success' : 'badge-danger'}>
                      {member.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="table-cell">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {member.lastLogin
                        ? new Date(member.lastLogin).toLocaleDateString('en-IN', {
                            day: 'numeric', month: 'short', year: 'numeric',
                          })
                        : 'Never'}
                    </span>
                  </td>
                  <td className="table-cell text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => { setEditMember(member); setShowModal(true); }}
                        className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-primary-500 transition-colors"
                        title="Edit member"
                      >
                        <FiEdit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(member._id)}
                        className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-danger-400 transition-colors"
                        title="Deactivate member"
                      >
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
          <button
            disabled={page <= 1}
            onClick={() => setPage(p => p - 1)}
            className="btn-secondary text-sm px-3 disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Page {page} of {pages}
          </span>
          <button
            disabled={page >= pages}
            onClick={() => setPage(p => p + 1)}
            className="btn-secondary text-sm px-3 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}

      {/* Info Card */}
      <div className="mt-6 p-4 bg-primary-50 dark:bg-primary-900/10 border border-primary-200 dark:border-primary-800 rounded-xl">
        <div className="flex items-start gap-3">
          <FiInfo className="w-5 h-5 text-primary-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-primary-800 dark:text-primary-200">About Team Roles</p>
            <ul className="mt-2 space-y-1 text-xs text-primary-700 dark:text-primary-300">
              <li><strong>Manager</strong> — Can manage products, orders, customers, inventory, purchases, suppliers, expenses, and view reports. Cannot change shop settings or manage other team members.</li>
              <li><strong>Staff</strong> — Can use POS, view products and customers, create orders. Limited access to other sections.</li>
              <li><strong>Shop Admin</strong> — Full access to all shop features including settings and team management. Created during shop registration.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Add/Edit Modal */}
      <TeamMemberModal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setEditMember(null); }}
        member={editMember}
        onSaved={load}
      />
    </div>
  );
}
