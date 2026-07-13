import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  FiTrash2, FiRefreshCw, FiSearch, FiRotateCcw,
  FiChevronLeft, FiChevronRight, FiShoppingBag,
  FiMail, FiPhone, FiMapPin, FiCalendar,
  FiX, FiAlertTriangle,
} from 'react-icons/fi';
import { apiService } from '../../services/api';
import toast from 'react-hot-toast';

function ConfirmModal({ title, message, confirmLabel, onConfirm, onCancel, loading, danger }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onCancel}>
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-sm w-full" onClick={e => e.stopPropagation()}>
        <h3 className={`text-lg font-bold mb-2 ${danger ? 'text-danger-600 dark:text-danger-400' : 'text-gray-900 dark:text-white'}`}>{title}</h3>
        <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">{message}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="btn-secondary flex-1" disabled={loading}>Cancel</button>
          <button onClick={onConfirm} disabled={loading} className={`${danger ? 'btn-danger' : 'btn-primary'} flex-1`}>
            {loading ? 'Processing...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function RecycleBinPage() {
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [confirmAction, setConfirmAction] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const loadShops = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiService.getRecycleBin({ page, limit: 20, search: search || undefined });
      setShops(res.data?.data || []);
      const pagination = res.data?.pagination || {};
      setTotalPages(pagination.pages || 1);
      setTotal(pagination.total || 0);
    } catch (err) {
      toast.error('Failed to load recycle bin');
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { loadShops(); }, [loadShops]);

  const [searchInput, setSearchInput] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => { setSearch(searchInput); setPage(1); }, 500);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const handleRestore = async (shopId, shopName) => {
    setActionLoading(true);
    try {
      await apiService.restoreShop(shopId);
      toast.success(`"${shopName}" restored successfully`);
      setConfirmAction(null);
      loadShops();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to restore shop');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePermanentDelete = async (shopId, shopName) => {
    setActionLoading(true);
    try {
      await apiService.permanentDeleteShop(shopId);
      toast.success(`"${shopName}" permanently deleted`);
      setConfirmAction(null);
      loadShops();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete shop');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="page-container">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Recycle Bin</h1>
            <span className="badge badge-info text-sm">{total} deleted shops</span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Restore permanently deleted shops or remove them permanently from the system.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/super-admin/shops" className="btn-secondary flex items-center gap-2">
            <FiShoppingBag className="w-4 h-4" />
            Active Shops
          </Link>
          <button onClick={loadShops} disabled={loading} className="btn-secondary flex items-center gap-2">
            <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="card mb-6">
        <div className="card-body">
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search deleted shops by name or email..."
              className="input-field pl-9"
            />
          </div>
        </div>
      </div>

      {/* Shops Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-900">
                <th className="table-header">Shop Name</th>
                <th className="table-header">Business Type</th>
                <th className="table-header">Email</th>
                <th className="table-header">Phone</th>
                <th className="table-header">City</th>
                <th className="table-header">Deleted At</th>
                <th className="table-header">Status</th>
                <th className="table-header text-right" style={{ minWidth: '160px' }}>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-gray-700">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className="table-cell"><div className="h-5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : shops.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12">
                    <FiTrash2 className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                    <p className="text-gray-400 dark:text-gray-500">Recycle bin is empty</p>
                    <p className="text-xs text-gray-400 mt-1">Deleted shops will appear here</p>
                  </td>
                </tr>
              ) : (
                shops.map((shop) => (
                  <tr key={shop._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="table-cell">
                      <span className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                        <FiTrash2 className="w-3.5 h-3.5 text-danger-400" />
                        {shop.name}
                      </span>
                    </td>
                    <td className="table-cell text-xs text-gray-500">
                      {shop.businessType?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </td>
                    <td className="table-cell">{shop.contact?.email || '-'}</td>
                    <td className="table-cell">{shop.contact?.phone || '-'}</td>
                    <td className="table-cell">{shop.address?.city || '-'}</td>
                    <td className="table-cell text-xs">
                      {shop.updatedAt ? new Date(shop.updatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                    </td>
                    <td className="table-cell">
                      <span className="badge badge-danger">Disabled</span>
                    </td>
                    <td className="table-cell text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setConfirmAction({
                            type: 'restore',
                            shopId: shop._id,
                            shopName: shop.name,
                          })}
                          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-success-500"
                          title="Restore Shop"
                        >
                          <FiRotateCcw className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setConfirmAction({
                            type: 'delete',
                            shopId: shop._id,
                            shopName: shop.name,
                          })}
                          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-danger-400"
                          title="Permanently Delete"
                        >
                          <FiX className="w-4 h-4" />
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
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t dark:border-gray-700">
            <p className="text-sm text-gray-500">Page {page} of {totalPages}</p>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary p-2 disabled:opacity-50">
                <FiChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="btn-secondary p-2 disabled:opacity-50">
                <FiChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Restore Confirmation */}
      {confirmAction?.type === 'restore' && (
        <ConfirmModal
          title="Restore this Shop?"
          message={`This will restore "${confirmAction.shopName}" and reactivate all its users and data.`}
          confirmLabel="Restore Shop"
          onConfirm={() => handleRestore(confirmAction.shopId, confirmAction.shopName)}
          onCancel={() => setConfirmAction(null)}
          loading={actionLoading}
        />
      )}

      {/* Permanent Delete Confirmation */}
      {confirmAction?.type === 'delete' && (
        <ConfirmModal
          title="Permanently Delete?"
          message={`This will permanently delete "${confirmAction.shopName}" and all associated data including users, products, orders, and customers. This cannot be undone!`}
          confirmLabel="Permanently Delete"
          onConfirm={() => handlePermanentDelete(confirmAction.shopId, confirmAction.shopName)}
          onCancel={() => setConfirmAction(null)}
          loading={actionLoading}
          danger={true}
        />
      )}
    </div>
  );
}
