import React, { useState, useEffect, useCallback } from 'react';
import { FiRefreshCw, FiAlertTriangle, FiClock, FiBox, FiSearch, FiX, FiEdit2 } from 'react-icons/fi';
import { apiService } from '../../services/api';
import toast from 'react-hot-toast';

function StockAdjustModal({ isOpen, onClose, product, onSave }) {
  const [qty, setQty] = useState(0);
  const [type, setType] = useState('add');
  const [reason, setReason] = useState('');

  if (!isOpen) return null;
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await apiService.updateStock(product._id, { quantity: qty, type, reason: reason || 'Manual adjustment' });
      toast.success('Stock updated'); onSave(); onClose();
    } catch (err) { toast.error('Failed'); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content max-w-sm" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b flex items-center justify-between"><h3 className="font-semibold">Adjust Stock: {product?.name}</h3><button onClick={onClose} className="p-1 rounded hover:bg-gray-100"><FiX /></button></div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <p className="text-sm text-gray-500">Current stock: <span className="font-bold text-gray-900">{product?.inventory?.quantity || 0}</span></p>
          <div className="flex gap-2"><button type="button" onClick={() => setType('add')} className={`flex-1 py-2 rounded-lg text-sm font-medium ${type === 'add' ? 'bg-success-500 text-white' : 'bg-gray-100 text-gray-600'}`}>Add Stock</button><button type="button" onClick={() => setType('remove')} className={`flex-1 py-2 rounded-lg text-sm font-medium ${type === 'remove' ? 'bg-danger-500 text-white' : 'bg-gray-100 text-gray-600'}`}>Remove Stock</button></div>
          <div><label className="block text-sm font-medium mb-1">Quantity</label><input type="number" value={qty} onChange={e => setQty(parseInt(e.target.value) || 0)} className="input-field" min="0" required /></div>
          <div><label className="block text-sm font-medium mb-1">Reason</label><input value={reason} onChange={e => setReason(e.target.value)} className="input-field" placeholder="e.g. Damaged, Audit, Return" /></div>
          <div className="flex justify-end gap-3 pt-4"><button type="button" onClick={onClose} className="btn-secondary">Cancel</button><button type="submit" className="btn-primary">Update Stock</button></div>
        </form>
      </div>
    </div>
  );
}

export default function InventoryPage() {
  const [summary, setSummary] = useState(null);
  const [logs, setLogs] = useState([]);
  const [expiring, setExpiring] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');
  const [adjustProduct, setAdjustProduct] = useState(null);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sumRes, logsRes, expRes] = await Promise.all([
        apiService.getStockSummary().catch(() => ({ data: { data: {} } })),
        apiService.getInventoryLogs({ limit: 20 }).catch(() => ({ data: { data: [] } })),
        apiService.getExpiringProducts(30).catch(() => ({ data: { data: [] } })),
      ]);
      setSummary(sumRes.data?.data || sumRes.data || {});
      setLogs(logsRes.data?.data || []);
      setExpiring(expRes.data?.data || []);
    } catch (err) { toast.error('Failed to load'); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'logs', label: 'Activity Log' },
    { id: 'expiring', label: `Expiring (${expiring.length})` },
  ];

  return (
    <div className="page-container">
      <div className="page-header">
        <div><h1 className="text-2xl font-bold">Inventory</h1><p className="text-sm text-gray-500 mt-1">Manage stock levels, track movements</p></div>
        <button onClick={load} disabled={loading} className="btn-secondary flex items-center gap-2"><FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />Refresh</button>
      </div>

      {/* Summary Cards */}
      {tab === 'overview' && <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[{ label: 'Total Products', value: summary?.totalProducts || 0, color: 'bg-primary-600', icon: FiBox }, { label: 'Total Stock', value: summary?.totalStock || 0, color: 'bg-info-500', icon: FiBox }, { label: 'Low Stock', value: summary?.lowStock || 0, color: 'bg-warning-500', icon: FiAlertTriangle }, { label: 'Stock Value', value: `₹${(summary?.totalValue || 0).toLocaleString('en-IN')}`, color: 'bg-success-500', icon: FiBox }].map((s, i) => (
          <div key={i} className="stat-card">
            <div className={`w-10 h-10 ${s.color} rounded-xl flex items-center justify-center`}><s.icon className="w-5 h-5 text-white" /></div>
            <div><p className="text-xs text-gray-500">{s.label}</p><p className="text-lg font-bold">{loading ? <div className="h-6 w-16 bg-gray-200 rounded animate-pulse" /> : s.value}</p></div>
          </div>
        ))}
      </div>}

      {/* Tabs */}
      <div className="flex gap-1 mb-4 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg w-fit">{tabs.map(t => (
        <button key={t.id} onClick={() => setTab(t.id)} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === t.id ? 'bg-white dark:bg-gray-700 shadow-sm text-primary-600' : 'text-gray-500 hover:text-gray-700'}`}>{t.label}</button>
      ))}</div>

      {tab === 'overview' && (
        <div className="card p-6">
          <h3 className="font-semibold mb-4">Quick Stock Adjustments</h3>
          <div className="relative mb-4"><FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search product to adjust stock..." className="input-field pl-9 py-2" /></div>
          <p className="text-sm text-gray-400 text-center py-4">Search for a product above to adjust its stock level</p>
        </div>
      )}

      {tab === 'logs' && (
        <div className="table-container">
          <table className="w-full">
            <thead><tr className="bg-gray-50 dark:bg-gray-900"><th className="table-header">Product</th><th className="table-header">Type</th><th className="table-header">Qty Change</th><th className="table-header">Previous</th><th className="table-header">New</th><th className="table-header">Reason</th><th className="table-header">Date</th><th className="table-header">By</th></tr></thead>
            <tbody className="divide-y">{(loading ? [] : logs).map((log, i) => (<tr key={log._id || i} className="hover:bg-gray-50"><td className="table-cell">{log.product?.name || '-'}</td><td className="table-cell"><span className={`badge ${log.type === 'sale' ? 'badge-info' : log.type === 'purchase' ? 'badge-success' : 'badge-warning'}`}>{log.type?.replace(/_/g, ' ')}</span></td><td className="table-cell font-medium">{log.quantity > 0 ? `+${log.quantity}` : log.quantity}</td><td className="table-cell">{log.previousStock}</td><td className="table-cell">{log.newStock}</td><td className="table-cell text-xs">{log.reason || '-'}</td><td className="table-cell text-xs">{new Date(log.createdAt).toLocaleDateString('en-IN')}</td><td className="table-cell text-xs">{log.createdBy?.name || '-'}</td></tr>))}</tbody>
          </table>
        </div>
      )}

      {tab === 'expiring' && (
        <div className="table-container">
          {expiring.length === 0 ? <div className="text-center py-12 text-gray-400"><FiClock className="w-12 h-12 mx-auto mb-3 opacity-30" /><p>No expiring products in next 30 days</p></div> : (
            <table className="w-full">
              <thead><tr className="bg-gray-50 dark:bg-gray-900"><th className="table-header">Product</th><th className="table-header">SKU</th><th className="table-header">Batch</th><th className="table-header">Quantity</th><th className="table-header">Expiry</th><th className="table-header">Days Left</th></tr></thead>
              <tbody className="divide-y">{expiring.map(p => (p.batches || []).map((b, i) => {
                const daysLeft = Math.ceil((new Date(b.expDate) - new Date()) / (1000 * 60 * 60 * 24));
                return (<tr key={`${p._id}-${i}`}><td className="table-cell">{p.name}</td><td className="table-cell text-xs">{p.sku}</td><td className="table-cell text-xs font-mono">{b.batchNumber}</td><td className="table-cell">{b.quantity}</td><td className="table-cell">{new Date(b.expDate).toLocaleDateString('en-IN')}</td><td className="table-cell"><span className={daysLeft <= 7 ? 'badge-danger' : daysLeft <= 15 ? 'badge-warning' : 'badge-info'}>{daysLeft} days</span></td></tr>);
              }))}</tbody>
            </table>
          )}
        </div>
      )}

      <StockAdjustModal isOpen={!!adjustProduct} onClose={() => setAdjustProduct(null)} product={adjustProduct} onSave={load} />
    </div>
  );
}
