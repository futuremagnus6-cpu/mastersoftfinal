import React, { useState, useEffect, useCallback } from 'react';
import { FiUsers, FiRefreshCw, FiSearch, FiUser, FiCalendar, FiMessageSquare, FiPlus, FiX } from 'react-icons/fi';
import { apiService } from '../../services/api';
import toast from 'react-hot-toast';

export default function CrmPage() {
  const [segments, setSegments] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [activity, setActivity] = useState([]);
  const [noteText, setNoteText] = useState('');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const loadSegments = useCallback(async () => {
    try {
      const res = await apiService.getCustomers({ limit: 5, sort: '-totalSpent' });
      const data = res.data?.data || [];
      setCustomers(data);
      // Compute segments from customer data
      const segMap = {};
      data.forEach(c => {
        const segment = c.loyalty?.tier || (c.totalSpent > 10000 ? 'Premium' : c.totalSpent > 1000 ? 'Regular' : 'New');
        segMap[segment] = (segMap[segment] || 0) + 1;
      });
      setSegments(Object.entries(segMap).map(([name, count]) => ({ name, count })));
    } catch (err) { /* silent */ }
  }, []);

  const loadActivity = useCallback(async (customerId) => {
    try {
      const res = await apiService.getCustomer(customerId);
      setActivity([{ type: 'Profile viewed', date: new Date(), detail: res.data?.data?.name || 'Customer' }]);
    } catch (err) { /* silent */ }
  }, []);

  useEffect(() => { loadSegments(); setLoading(false); }, [loadSegments]);

  const handleAddNote = async () => {
    if (!noteText.trim() || !selectedCustomer) return;
    try {
      await apiService.updateCustomer(selectedCustomer._id, { notes: (selectedCustomer.notes || '') + '\n' + new Date().toLocaleDateString('en-IN') + ': ' + noteText });
      toast.success('Note added');
      setNoteText('');
      loadActivity(selectedCustomer._id);
    } catch (err) { toast.error('Failed to add note'); }
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">CRM</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Customer relationship management</p>
        </div>
        <button onClick={() => { loadSegments(); }} className="btn-secondary flex items-center gap-2"><FiRefreshCw className="w-4 h-4" /> Refresh</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Customer Segments Sidebar */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <h3 className="font-semibold text-sm mb-3 flex items-center gap-2"><FiUsers className="w-4 h-4" /> Segments</h3>
            <div className="space-y-2">
              {segments.map(s => (
                <div key={s.name} className="flex items-center justify-between py-1.5">
                  <span className="text-sm text-gray-600 dark:text-gray-300">{s.name}</span>
                  <span className="text-xs font-medium px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 rounded-full">{s.count}</span>
                </div>
              ))}
              {segments.length === 0 && <p className="text-xs text-gray-400">No segments found</p>}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <h3 className="font-semibold text-sm mb-3">Top Customers</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {customers.map(c => (
                <button key={c._id} onClick={() => { setSelectedCustomer(c); loadActivity(c._id); }} className={`w-full text-left p-2 rounded-lg text-sm transition-colors flex items-center gap-2 ${selectedCustomer?._id === c._id ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600' : 'hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
                  <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0"><FiUser className="w-3.5 h-3.5 text-indigo-600" /></div>
                  <div className="min-w-0"><p className="text-xs font-medium truncate">{c.name}</p><p className="text-[10px] text-gray-400">₹{(c.totalSpent || 0).toLocaleString()}</p></div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3 space-y-4">
          {selectedCustomer ? (
            <>
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center"><FiUser className="w-5 h-5 text-indigo-600" /></div>
                    <div><h3 className="font-semibold">{selectedCustomer.name}</h3><p className="text-xs text-gray-500">{selectedCustomer.mobile} · {selectedCustomer.email || '-'}</p></div>
                  </div>
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${selectedCustomer.isActive ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>{selectedCustomer.isActive ? 'Active' : 'Inactive'}</span>
                </div>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div><p className="text-lg font-bold">₹{(selectedCustomer.totalSpent || 0).toLocaleString()}</p><p className="text-xs text-gray-400">Total Spent</p></div>
                  <div><p className="text-lg font-bold">{selectedCustomer.totalOrders || 0}</p><p className="text-xs text-gray-400">Orders</p></div>
                  <div><p className="text-lg font-bold">{selectedCustomer.loyalty?.points || 0}</p><p className="text-xs text-gray-400">Loyalty Points</p></div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                <h3 className="font-semibold text-sm mb-3 flex items-center gap-2"><FiMessageSquare className="w-4 h-4" /> Notes</h3>
                <div className="flex gap-2 mb-3">
                  <input type="text" value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="Add a note..." className="input-field text-sm flex-1" onKeyDown={e => e.key === 'Enter' && handleAddNote()} />
                  <button onClick={handleAddNote} disabled={!noteText.trim()} className="btn-primary text-sm px-3"><FiPlus className="w-4 h-4" /></button>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {selectedCustomer.notes?.split('\n').filter(Boolean).map((note, i) => (
                    <div key={i} className="text-xs text-gray-600 dark:text-gray-300 p-2 bg-gray-50 dark:bg-gray-700/30 rounded">{note}</div>
                  ))}
                  {!selectedCustomer.notes && <p className="text-xs text-gray-400">No notes yet</p>}
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                <h3 className="font-semibold text-sm mb-3 flex items-center gap-2"><FiCalendar className="w-4 h-4" /> Recent Activity</h3>
                {activity.length === 0 ? <p className="text-xs text-gray-400">No activity recorded</p> : activity.map((a, i) => (
                  <div key={i} className="flex items-center gap-3 py-2 border-b last:border-0 border-gray-100 dark:border-gray-700">
                    <div className="w-2 h-2 rounded-full bg-indigo-400" />
                    <div className="flex-1"><p className="text-xs text-gray-600 dark:text-gray-300">{a.type}</p><p className="text-[10px] text-gray-400">{a.detail}</p></div>
                    <span className="text-[10px] text-gray-400">{a.date.toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
              <FiUsers className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
              <h3 className="text-lg font-medium text-gray-500 dark:text-gray-400">Select a customer</h3>
              <p className="text-sm text-gray-400 mt-1">Choose a customer from the list to view their CRM profile</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
