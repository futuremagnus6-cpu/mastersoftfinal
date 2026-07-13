import React, { useState, useEffect, useCallback } from 'react';
import { FiGift, FiRefreshCw, FiPlus, FiX, FiStar, FiUsers, FiTrendingUp, FiAward } from 'react-icons/fi';
import { apiService } from '../../services/api';
import toast from 'react-hot-toast';

function TierModal({ isOpen, onClose, tier, onSaved }) {
  const [form, setForm] = useState({ name: '', level: 1, minPoints: 0, minSpend: 0, benefits: { discountPercent: 0, pointsMultiplier: 1, freeDelivery: false, prioritySupport: false, birthdayBonus: 0 }, color: '#808080', sortOrder: 0 });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (tier) {
      setForm({
        name: tier.name || '',
        level: tier.level || 1,
        minPoints: tier.minPoints || 0,
        minSpend: tier.minSpend || 0,
        benefits: {
          discountPercent: tier.benefits?.discountPercent || 0,
          pointsMultiplier: tier.benefits?.pointsMultiplier || 1,
          freeDelivery: tier.benefits?.freeDelivery || false,
          prioritySupport: tier.benefits?.prioritySupport || false,
          birthdayBonus: tier.benefits?.birthdayBonus || 0,
        },
        color: tier.color || '#808080',
        sortOrder: tier.sortOrder || 0,
      });
    } else {
      setForm({ name: '', level: 1, minPoints: 0, minSpend: 0, benefits: { discountPercent: 0, pointsMultiplier: 1, freeDelivery: false, prioritySupport: false, birthdayBonus: 0 }, color: '#808080', sortOrder: 0 });
    }
  }, [tier, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name) { toast.error('Tier name required'); return; }
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        level: form.level,
        minPoints: form.minPoints,
        minSpend: form.minSpend,
        benefits: form.benefits,
        color: form.color,
        sortOrder: form.sortOrder,
      };
      if (tier) await apiService.updateLoyaltyTier(tier._id, payload);
      else await apiService.createLoyaltyTier(payload);
      toast.success(tier ? 'Tier updated' : 'Tier created');
      onSaved?.(); onClose();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to save tier'); } finally { setSaving(false); }
  };

  if (!isOpen) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content max-w-md" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b flex items-center justify-between"><h3 className="font-semibold">{tier ? 'Edit' : 'New'} Tier</h3><button onClick={onClose} className="p-1 rounded hover:bg-gray-100"><FiX /></button></div>
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs font-medium block mb-1">Tier Name *</label><input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="input-field text-sm" required /></div>
            <div><label className="text-xs font-medium block mb-1">Level (order)</label><input type="number" value={form.level} onChange={e => setForm(f => ({ ...f, level: parseInt(e.target.value) || 1 }))} className="input-field text-sm" min={1} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs font-medium block mb-1">Min Points</label><input type="number" value={form.minPoints} onChange={e => setForm(f => ({ ...f, minPoints: parseInt(e.target.value) || 0 }))} className="input-field text-sm" /></div>
            <div><label className="text-xs font-medium block mb-1">Min Spend (₹)</label><input type="number" value={form.minSpend} onChange={e => setForm(f => ({ ...f, minSpend: parseFloat(e.target.value) || 0 }))} className="input-field text-sm" /></div>
          </div>
          <div className="border-t pt-3">
            <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wider">Benefits</p>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-medium block mb-1">Discount %</label><input type="number" value={form.benefits.discountPercent} onChange={e => setForm(f => ({ ...f, benefits: { ...f.benefits, discountPercent: parseFloat(e.target.value) || 0 } }))} className="input-field text-sm" min={0} max={100} step="0.5" /></div>
              <div><label className="text-xs font-medium block mb-1">Points Multiplier</label><input type="number" value={form.benefits.pointsMultiplier} onChange={e => setForm(f => ({ ...f, benefits: { ...f.benefits, pointsMultiplier: parseFloat(e.target.value) || 1 } }))} className="input-field text-sm" min={1} step="0.1" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-2">
              <div><label className="text-xs font-medium block mb-1">Birthday Bonus</label><input type="number" value={form.benefits.birthdayBonus} onChange={e => setForm(f => ({ ...f, benefits: { ...f.benefits, birthdayBonus: parseFloat(e.target.value) || 0 } }))} className="input-field text-sm" /></div>
              <div><label className="text-xs font-medium block mb-1">Color</label><input type="color" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} className="input-field h-9" /></div>
            </div>
            <div className="flex items-center gap-4 mt-3">
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.benefits.freeDelivery} onChange={e => setForm(f => ({ ...f, benefits: { ...f.benefits, freeDelivery: e.target.checked } }))} className="rounded" /> Free Delivery</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.benefits.prioritySupport} onChange={e => setForm(f => ({ ...f, benefits: { ...f.benefits, prioritySupport: e.target.checked } }))} className="rounded" /> Priority Support</label>
            </div>
          </div>
          <div className="flex gap-3 pt-4 border-t"><button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button><button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Saving...' : 'Save'}</button></div>
        </form>
      </div>
    </div>
  );
}

export default function LoyaltyPage() {
  const [tiers, setTiers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('tiers');
  const [showTierModal, setShowTierModal] = useState(false);
  const [editTier, setEditTier] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [tiersRes, txRes] = await Promise.all([
        apiService.getLoyaltyTiers().catch(() => ({ data: { data: [] } })),
        apiService.getLoyaltyTransactions({ limit: 20 }).catch(() => ({ data: { data: [] } })),
      ]);
      setTiers(tiersRes.data?.data || []);
      setTransactions(txRes.data?.data || []);
    } catch (err) { toast.error('Failed to load'); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const tabs = [
    { id: 'tiers', label: `Tiers (${tiers.length})`, icon: FiAward },
    { id: 'transactions', label: 'Activity', icon: FiTrendingUp },
  ];

  return (
    <div className="page-container">
      <div className="page-header">
        <div><h1 className="text-2xl font-bold flex items-center gap-2"><FiGift className="w-6 h-6 text-primary-500" /> Loyalty Program</h1><p className="text-sm text-gray-500 mt-1">Manage membership tiers and rewards</p></div>
        <button onClick={load} disabled={loading} className="btn-secondary flex items-center gap-2"><FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh</button>
      </div>

      <div className="flex gap-1 mb-6 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg w-fit">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === t.id ? 'bg-white dark:bg-gray-700 shadow-sm text-primary-600' : 'text-gray-500'}`}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'tiers' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-500">Configure loyalty tiers and their benefits</p>
            <button onClick={() => { setEditTier(null); setShowTierModal(true); }} className="btn-primary text-sm flex items-center gap-1"><FiPlus className="w-4 h-4" /> Add Tier</button>
          </div>
          {loading ? <div className="grid grid-cols-1 md:grid-cols-3 gap-4">{[1,2,3].map(i => <div key={i} className="card p-6 h-40 animate-pulse bg-gray-100" />)}</div>
          : tiers.length === 0 ? <div className="text-center py-16 text-gray-400"><FiAward className="w-16 h-16 mx-auto mb-4 opacity-30" /><p>No loyalty tiers configured</p><button onClick={() => setShowTierModal(true)} className="btn-primary mt-4 text-sm">Create First Tier</button></div>
          : <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {tiers.map(t => {
                const b = t.benefits || {};
                return (
                  <div key={t._id} className="card p-6 relative">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl flex items-center justify-center shadow-lg">
                        <FiStar className="w-6 h-6 text-white" />
                      </div>
                      <div><h3 className="font-semibold text-lg">{t.name}</h3><p className="text-xs text-gray-500">Level {t.level} · Min {t.minPoints || 0} pts</p></div>
                    </div>
                    {b.discountPercent > 0 && <p className="text-sm mb-1"><span className="font-bold text-primary-600">{b.discountPercent}%</span> discount</p>}
                    {b.pointsMultiplier > 1 && <p className="text-sm mb-1"><span className="font-medium">{b.pointsMultiplier}x</span> points multiplier</p>}
                    {b.birthdayBonus > 0 && <p className="text-sm mb-1">🎂 {b.birthdayBonus} birthday bonus</p>}
                    <div className="flex flex-wrap gap-2 mt-2">
                      {b.freeDelivery && <span className="text-[10px] bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-2 py-0.5 rounded-full">Free Delivery</span>}
                      {b.prioritySupport && <span className="text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 px-2 py-0.5 rounded-full">Priority Support</span>}
                    </div>
                    <div className="mt-4 flex gap-2"><button onClick={() => { setEditTier(t); setShowTierModal(true); }} className="btn-secondary text-xs flex-1">Edit</button></div>
                  </div>
                );
              })}
            </div>}
        </div>
      )}

      {tab === 'transactions' && (
        <div className="table-container">
          <table className="w-full">
            <thead><tr className="bg-gray-50 dark:bg-gray-900"><th className="table-header">Customer</th><th className="table-header">Type</th><th className="table-header">Points</th><th className="table-header">Order</th><th className="table-header">Date</th></tr></thead>
            <tbody className="divide-y">
              {transactions.map((t, i) => {
                const isEarned = ['earned', 'bonus', 'birthday_bonus', 'referral_bonus'].includes(t.type);
                const isRedeemed = t.type === 'redeemed';
                return (
                  <tr key={t._id || i} className="hover:bg-gray-50">
                    <td className="table-cell">{t.customerName || t.customer?.name || 'Walk-in'}</td>
                    <td className="table-cell">
                      <span className={isEarned ? 'badge-success' : isRedeemed ? 'badge-warning' : 'badge-info'}>
                        {t.type?.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className={`table-cell font-medium ${isEarned ? 'text-green-600' : 'text-red-600'}`}>
                      {isEarned ? '+' : '-'}{t.points || 0}
                    </td>
                    <td className="table-cell text-xs font-mono">{t.referenceNumber || t.reference || '-'}</td>
                    <td className="table-cell text-xs">{new Date(t.createdAt).toLocaleDateString('en-IN')}</td>
                  </tr>
                );
              })}
              {transactions.length === 0 && <tr><td colSpan={5} className="text-center py-8 text-gray-400">No loyalty activity yet</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      <TierModal isOpen={showTierModal} onClose={() => { setShowTierModal(false); setEditTier(null); }} tier={editTier} onSaved={load} />
    </div>
  );
}
