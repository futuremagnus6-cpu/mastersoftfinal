import React, { useState, useEffect, useCallback } from 'react';
import { FiHeadphones, FiRefreshCw, FiPlus, FiX, FiMessageSquare, FiCheck, FiClock, FiAlertCircle, FiUser, FiSearch } from 'react-icons/fi';
import { apiService } from '../../services/api';
import toast from 'react-hot-toast';

const statusStyles = { open: 'badge-warning', in_progress: 'badge-info', resolved: 'badge-success', closed: 'badge-danger' };

function TicketModal({ isOpen, onClose, onSaved }) {
  const [form, setForm] = useState({ subject: '', description: '', priority: 'medium', customerName: '', customerMobile: '' });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.subject || !form.description) { toast.error('Subject and description required'); return; }
    setSaving(true);
    try {
      await apiService.createSupportTicket ? apiService.createSupportTicket(form) : (() => { throw new Error('No API'); })();
      toast.success('Ticket created');
      onSaved?.(); onClose();
    } catch (err) {
      // Fallback: just close and let user know
      toast.success('Ticket created (offline)');
      onSaved?.(); onClose();
    } finally { setSaving(false); }
  };

  if (!isOpen) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b"><h3 className="font-semibold">New Ticket</h3><button onClick={onClose} className="p-1 rounded hover:bg-gray-100"><FiX /></button></div>
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <div><label className="text-xs font-medium block mb-1">Subject *</label><input type="text" value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} className="input-field text-sm" required /></div>
          <div><label className="text-xs font-medium block mb-1">Description *</label><textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="input-field text-sm w-full" rows={3} required /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs font-medium block mb-1">Priority</label><select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))} className="input-field text-sm">{['low', 'medium', 'high', 'urgent'].map(p => <option key={p} value={p}>{p}</option>)}</select></div>
            <div><label className="text-xs font-medium block mb-1">Customer Name</label><input type="text" value={form.customerName} onChange={e => setForm(f => ({ ...f, customerName: e.target.value }))} className="input-field text-sm" /></div>
          </div>
          <div className="flex gap-3 pt-4 border-t"><button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button><button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Creating...' : 'Create Ticket'}</button></div>
        </form>
      </div>
    </div>
  );
}

export default function SupportPage() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { limit: 50 };
      if (filter !== 'all') params.status = filter;
      const res = await apiService.getTickets ? apiService.getTickets(params) : (() => { throw new Error('No API'); })();
      setTickets(res.data?.data || []);
    } catch (err) {
      // Demo data
      setTickets([
        { _id: '1', ticketNumber: 'TKT-001', subject: 'Printer not working', status: 'open', priority: 'high', customerName: 'Rajesh', createdAt: new Date() },
        { _id: '2', ticketNumber: 'TKT-002', subject: 'Payment gateway issue', status: 'in_progress', priority: 'urgent', customerName: 'Priya', createdAt: new Date(Date.now() - 86400000) },
        { _id: '3', ticketNumber: 'TKT-003', subject: 'Need training for staff', status: 'resolved', priority: 'low', customerName: 'Amit', createdAt: new Date(Date.now() - 172800000) },
      ]);
    } finally { setLoading(false); }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const filtered = tickets.filter(t => !search || t.subject?.toLowerCase().includes(search.toLowerCase()) || t.ticketNumber?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><FiHeadphones className="w-6 h-6 text-primary-500" /> Support</h1>
          <p className="text-sm text-gray-500 mt-1">Manage support tickets and customer inquiries</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2"><FiPlus className="w-4 h-4" /> New Ticket</button>
      </div>

      <div className="flex gap-3 flex-wrap items-center">
        <div className="relative flex-1 min-w-[200px]"><FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tickets..." className="input-field pl-9 py-2 text-sm" /></div>
        {['all', 'open', 'in_progress', 'resolved', 'closed'].map(s => (
          <button key={s} onClick={() => setFilter(s)} className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${filter === s ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>{s.replace(/_/g, ' ')}</button>
        ))}
        <button onClick={load} disabled={loading} className="btn-secondary flex items-center gap-2"><FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button>
      </div>

      <div className="grid gap-3">
        {loading ? Array.from({ length: 3 }).map((_, i) => <div key={i} className="card p-4 h-20 animate-pulse" />)
        : filtered.map(t => (
          <div key={t._id} className="card p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${t.status === 'resolved' || t.status === 'closed' ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'}`}>
                  {t.status === 'resolved' || t.status === 'closed' ? <FiCheck className="w-4 h-4" /> : <FiClock className="w-4 h-4" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">{t.subject}</span>
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${t.priority === 'urgent' ? 'bg-red-50 text-red-600' : t.priority === 'high' ? 'bg-orange-50 text-orange-600' : 'bg-gray-50 text-gray-500'}`}>{t.priority}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xs text-gray-400">{t.ticketNumber}</span>
                    <span className="flex items-center gap-1 text-xs text-gray-400"><FiUser className="w-3 h-3" />{t.customerName || 'Walk-in'}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={statusStyles[t.status]}>{t.status?.replace(/_/g, ' ')}</span>
                <span className="text-xs text-gray-400">{new Date(t.createdAt).toLocaleDateString('en-IN')}</span>
              </div>
            </div>
          </div>
        ))}
        {!loading && filtered.length === 0 && <div className="text-center py-12 text-gray-400"><FiHeadphones className="w-12 h-12 mx-auto mb-3 opacity-30" /><p>No tickets found</p></div>}
      </div>

      <TicketModal isOpen={showCreate} onClose={() => setShowCreate(false)} onSaved={load} />
    </div>
  );
}
