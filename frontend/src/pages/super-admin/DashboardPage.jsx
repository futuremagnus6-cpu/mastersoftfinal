import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FiShoppingBag, FiDollarSign, FiTrendingUp,
  FiTrendingDown, FiShield, FiRefreshCw, FiMoreHorizontal,
  FiEye, FiToggleLeft, FiToggleRight, FiTrash2, FiPlus,
  FiActivity, FiCreditCard, FiCalendar, FiCheckCircle, FiXCircle,
  FiMail, FiMessageSquare, FiClock,
} from 'react-icons/fi';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { apiService } from '../../services/api';
import toast from 'react-hot-toast';

// ─── Stat Card Component ───
function StatCard({ title, value, change, icon: Icon, color, loading }) {
  return (
    <div className="stat-card animate-fade-in">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-500 dark:text-gray-400">{title}</p>
        {loading ? (
          <div className="h-7 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mt-1" />
        ) : (
          <p className="text-lg font-bold text-gray-900 dark:text-white">{value}</p>
        )}
        {change !== undefined && (
          <div className={`flex items-center gap-1 text-xs mt-0.5 ${change >= 0 ? 'text-success-600' : 'text-danger-600'}`}>
            {change >= 0 ? <FiTrendingUp className="w-3 h-3" /> : <FiTrendingDown className="w-3 h-3" />}
            <span>{Math.abs(change)}% vs last month</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Recent Shop Row Component ───
function ShopRow({ shop, onAction }) {
  const statusColors = {
    active: 'badge-success',
    inactive: 'badge-warning',
    suspended: 'badge-danger',
    disabled: 'badge-info',
    trial: 'badge-info',
  };

  return (
    <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
      <td className="table-cell">
        <div>
          <p className="font-medium text-gray-900 dark:text-white">{shop.name}</p>
          <p className="text-xs text-gray-500">{shop.businessType?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</p>
        </div>
      </td>
      <td className="table-cell">{shop.contact?.email || '-'}</td>
      <td className="table-cell">{shop.contact?.phone || '-'}</td>
      <td className="table-cell">
        <span className={statusColors[shop.status] || 'badge-info'}>{shop.status}</span>
      </td>
      <td className="table-cell">
        <span className={statusColors[shop.subscription?.status]}>{shop.subscription?.status}</span>
      </td>
      <td className="table-cell text-right">
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={() => onAction('view', shop._id)}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400"
            title="View Details"
          >
            <FiEye className="w-4 h-4" />
          </button>
          {shop.status === 'active' ? (
            <button
              onClick={() => onAction('suspend', shop._id)}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-warning-500"
              title="Suspend"
            >
              <FiToggleRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={() => onAction('activate', shop._id)}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-success-500"
              title="Activate"
            >
              <FiToggleLeft className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => onAction('delete', shop._id)}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-danger-400"
            title="Delete"
          >
            <FiTrash2 className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}

// ─── Revenue Chart ───
function RevenueChart({ data, loading }) {
  if (loading) return <div className="h-64 bg-gray-100 dark:bg-gray-700 rounded-lg animate-pulse" />;
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="month" stroke="#9ca3af" fontSize={12} />
        <YAxis stroke="#9ca3af" fontSize={12} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
        <Tooltip
          contentStyle={{ background: '#1e293b', border: 'none', borderRadius: '8px', color: '#f8fafc' }}
          formatter={(value, name) => [
            `₹${value.toLocaleString('en-IN')}`,
            name === 'revenue' ? 'Subscription Revenue' : 'Transactions'
          ]}
        />
        <Line type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={2} dot={{ fill: '#2563eb', r: 4 }} name="revenue" />
        <Line type="monotone" dataKey="transactions" stroke="#f59e0b" strokeWidth={2} dot={{ fill: '#f59e0b', r: 4 }} name="transactions" />
      </LineChart>
    </ResponsiveContainer>
  );
}

// ─── Subscription Pie Chart ───
function SubscriptionChart({ data, loading }) {
  const COLORS = ['#22c55e', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6'];

  if (loading) return <div className="h-48 bg-gray-100 dark:bg-gray-700 rounded-lg animate-pulse" />;
  if (!data?.length) return <p className="text-center text-gray-400 py-8">No data</p>;

  return (
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie data={data} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="count">
          {data.map((_, index) => (
            <Cell key={index} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
        <Legend verticalAlign="bottom" height={36} />
      </PieChart>
    </ResponsiveContainer>
  );
}

// ─── Main Dashboard Page ───
export default function SuperAdminDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState(null);
  const [shops, setShops] = useState([]);
  const [revenueData, setRevenueData] = useState([]);
  const [error, setError] = useState(null);

  const [enquiries, setEnquiries] = useState([]);
  const [preShopsCount, setPreShopsCount] = useState(0);

  // Load dashboard data
  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [dashRes, shopsRes, enquiriesRes] = await Promise.all([
        apiService.getSuperAdminDashboard().catch(() => null),
        apiService.getShops({ limit: 10 }).catch(() => null),
        apiService.getEnquiries({ limit: 5 }).catch(() => null),
      ]);

      const dashData = dashRes?.data?.data || dashRes?.data || {};
      const shopsData = shopsRes?.data?.data || shopsRes?.data?.shops || [];

      // Count pre-shops (trial shops)
      const trialShops = Array.isArray(shopsData) ? shopsData.filter(s => s.subscription?.status === 'trial') : [];
      setPreShopsCount(trialShops.length);

      setDashboard(dashData);
      setShops(Array.isArray(shopsData) ? shopsData : []);
      setEnquiries(enquiriesRes?.data?.data || dashData?.enquiries || []);

      // Real revenue trend from billing transactions
      const rawTrend = dashData?.revenueTrend || [];
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const trendData = rawTrend.map(item => ({
        month: item._id
          ? monthNames[parseInt(item._id.split('-')[1], 10) - 1] || item._id
          : item._id,
        revenue: item.revenue || 0,
        transactions: item.transactions || 0,
      }));
      setRevenueData(trendData);
    } catch (err) {
      console.error('Dashboard load error:', err);
      setError('Failed to load dashboard data');
      toast.error('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  const handleShopAction = async (action, shopId) => {
    try {
      if (action === 'activate') await apiService.activateShop(shopId);
      else if (action === 'suspend') await apiService.suspendShop(shopId);
      else if (action === 'delete') {
        if (!window.confirm('Are you sure you want to delete this shop?')) return;
        await apiService.deleteShop(shopId);
      } else if (action === 'view') {
        navigate(`/super-admin/shops/${shopId}`);
        return;
      }
      toast.success(`Shop ${action}d successfully`);
      loadDashboard();
    } catch (err) {
      toast.error(err.response?.data?.message || `Failed to ${action} shop`);
    }
  };

  // Subscription data for pie chart
  const subscriptionData = dashboard?.shopsByPlan?.map((s) => ({
    name: s._id || 'unknown',
    count: s.count,
  })) || [];

  return (
    <div className="page-container">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Platform Dashboard</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Super Admin Control Center — Monitor all shops, revenue, and system health
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadDashboard}
            disabled={loading}
            className="btn-secondary flex items-center gap-2"
          >
            <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <Link to="/super-admin/shops" className="btn-primary flex items-center gap-2">
            <FiPlus className="w-4 h-4" />
            New Shop
          </Link>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800 rounded-lg">
          <p className="text-sm text-danger-600 dark:text-danger-400">{error}</p>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4 mb-6">
        <StatCard title="Total Shops" value={dashboard?.totalShops || 0} loading={loading} icon={FiShoppingBag} color="bg-primary-600" />
        <StatCard title="Active Shops" value={dashboard?.activeShops || 0} loading={loading} icon={FiShield} color="bg-success-500" />
        <StatCard title="Pre-Shops (Trial)" value={preShopsCount} loading={loading} icon={FiClock} color="bg-info-500" />
        <StatCard title="Subscription Revenue" value={`₹${(dashboard?.totalRevenue || 0).toLocaleString('en-IN')}`} loading={loading} icon={FiDollarSign} color="bg-warning-500" />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Revenue Chart */}
        <div className="card lg:col-span-2">
          <div className="card-header">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">Subscription Revenue Trend</h3>
          </div>
          <div className="card-body">
            <RevenueChart data={revenueData} loading={loading} />
          </div>
        </div>

        {/* Subscription Distribution */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">Subscription Status</h3>
          </div>
          <div className="card-body">
            <SubscriptionChart data={subscriptionData} loading={loading} />
          </div>
        </div>
      </div>

      {/* Recent Shops Table */}
      <div className="card">
        <div className="card-header flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">Recent Shops</h3>
          <Link to="/super-admin/shops" className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400">
            View All
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-900">
                <th className="table-header">Shop</th>
                <th className="table-header">Email</th>
                <th className="table-header">Phone</th>
                <th className="table-header">Status</th>
                <th className="table-header">Subscription</th>
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
              ) : shops.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-gray-400">No shops found</td>
                </tr>
              ) : (
                shops.map((shop) => (
                  <ShopRow key={shop._id} shop={shop} onAction={handleShopAction} />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Enquiries Section */}
      {enquiries.length > 0 && (
        <div className="card mt-6">
          <div className="card-header flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FiMessageSquare className="w-4 h-4 text-primary-500" />
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">Recent Enquiries</h3>
            </div>
            <span className="badge badge-warning">{enquiries.filter(e => e.status === 'new').length} New</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-900">
                  <th className="table-header">Name</th>
                  <th className="table-header">Email</th>
                  <th className="table-header">Message</th>
                  <th className="table-header">Status</th>
                  <th className="table-header">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-gray-700">
                {enquiries.map((enq, idx) => (
                  <tr key={enq._id || idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="table-cell">
                      <span className="font-medium text-gray-900 dark:text-white">{enq.name}</span>
                    </td>
                    <td className="table-cell text-sm">{enq.email}</td>
                    <td className="table-cell max-w-xs">
                      <p className="text-sm text-gray-500 truncate">{enq.message}</p>
                    </td>
                    <td className="table-cell">
                      <span className={`badge ${enq.status === 'new' ? 'badge-warning' : enq.status === 'read' ? 'badge-info' : enq.status === 'replied' ? 'badge-success' : 'badge-secondary'}`}>
                        {enq.status}
                      </span>
                    </td>
                    <td className="table-cell text-xs text-gray-500">
                      {new Date(enq.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
        <Link to="/super-admin/shops" className="card p-5 hover:shadow-md transition-shadow flex items-center gap-4 group">
          <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
            <FiShoppingBag className="w-6 h-6 text-primary-600" />
          </div>
          <div>
            <p className="font-medium text-gray-900 dark:text-white">Manage Shops</p>
            <p className="text-sm text-gray-500">Create, activate, or suspend shops</p>
          </div>
        </Link>
        <Link to="/super-admin/plans" className="card p-5 hover:shadow-md transition-shadow flex items-center gap-4 group">
          <div className="w-12 h-12 bg-warning-100 dark:bg-warning-900/30 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
            <FiCreditCard className="w-6 h-6 text-warning-600" />
          </div>
          <div>
            <p className="font-medium text-gray-900 dark:text-white">Subscription Plans</p>
            <p className="text-sm text-gray-500">Manage pricing and feature flags</p>
          </div>
        </Link>
        <Link to="/super-admin/analytics" className="card p-5 hover:shadow-md transition-shadow flex items-center gap-4 group">
          <div className="w-12 h-12 bg-info-100 dark:bg-info-900/30 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
            <FiActivity className="w-6 h-6 text-info-600" />
          </div>
          <div>
            <p className="font-medium text-gray-900 dark:text-white">Analytics</p>
            <p className="text-sm text-gray-500">View platform-wide analytics</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
