import React, { useState, useEffect, useCallback } from 'react';
import {
  FiTrendingUp, FiDollarSign, FiPackage, FiUsers,
  FiShoppingBag, FiRefreshCw, FiServer, FiClock,
  FiHardDrive, FiActivity, FiCheckCircle,
} from 'react-icons/fi';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';
import api, { apiService } from '../../services/api';
import toast from 'react-hot-toast';

const COLORS = ['#2563eb', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

// ─── Stat Card ───
function StatCard({ title, value, icon: Icon, color, loading }) {
  return (
    <div className="stat-card">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
        {loading ? (
          <div className="h-7 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mt-1" />
        ) : (
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
        )}
      </div>
    </div>
  );
}

// ─── Main Analytics Page ───
export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [revenueData, setRevenueData] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [customerData, setCustomerData] = useState(null);
  const [systemHealth, setSystemHealth] = useState(null);
  const [period, setPeriod] = useState('monthly');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [revenueRes, productRes, customerRes, healthRes] = await Promise.allSettled([
        api.get('/analytics/revenue', { params: { period } }),
        api.get('/analytics/products'),
        api.get('/analytics/customers'),
        api.get('/analytics/system-health'),
      ]);

      if (revenueRes.status === 'fulfilled') {
        const data = revenueRes.value.data?.data || [];
        setRevenueData(Array.isArray(data) ? data : []);
      }
      if (productRes.status === 'fulfilled') {
        const data = productRes.value.data?.data || {};
        setTopProducts(data.topSelling || []);
      }
      if (customerRes.status === 'fulfilled') {
        setCustomerData(customerRes.value.data?.data || null);
      }
      if (healthRes.status === 'fulfilled') {
        setSystemHealth(healthRes.value.data?.data || null);
      }
    } catch (err) {
      console.error('Analytics load error:', err);
      toast.error('Failed to load some analytics data');
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => { loadData(); }, [loadData]);

  const formatRevenue = (value) => `₹${(value || 0).toLocaleString('en-IN')}`;

  return (
    <div className="page-container">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Platform Analytics</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Platform-wide analytics and insights
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="input-field w-40"
          >
            <option value="daily">Daily</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
          <button onClick={loadData} disabled={loading} className="btn-secondary flex items-center gap-2">
            <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* System Health Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Total Shops"
          value={systemHealth?.totalShops || 0}
          icon={FiShoppingBag}
          color="bg-primary-600"
          loading={loading}
        />
        <StatCard
          title="Active Shops"
          value={systemHealth?.activeShops || 0}
          icon={FiCheckCircle}
          color="bg-success-500"
          loading={loading}
        />
        <StatCard
          title="Total Users"
          value={systemHealth?.totalUsers || 0}
          icon={FiUsers}
          color="bg-violet-500"
          loading={loading}
        />
        <StatCard
          title="Database"
          value={systemHealth?.database === 'connected' ? 'Connected' : 'Disconnected'}
          icon={FiServer}
          color={systemHealth?.database === 'connected' ? 'bg-success-500' : 'bg-danger-500'}
          loading={loading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Revenue Trend */}
        <div className="card lg:col-span-2">
          <div className="card-header">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">Revenue Trend</h3>
          </div>
          <div className="card-body">
            {loading ? (
              <div className="h-72 bg-gray-100 dark:bg-gray-700 rounded-lg animate-pulse" />
            ) : revenueData.length === 0 ? (
              <div className="h-72 flex items-center justify-center text-gray-400">No revenue data available</div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="_id" stroke="#9ca3af" fontSize={12} />
                  <YAxis stroke="#9ca3af" fontSize={12} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    contentStyle={{ background: '#1e293b', border: 'none', borderRadius: '8px', color: '#f8fafc' }}
                    formatter={(value) => [formatRevenue(value), '']}
                  />
                  <Line type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={2} name="Revenue" dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="orders" stroke="#f59e0b" strokeWidth={2} name="Orders" dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Top Selling Products */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">Top Selling Products</h3>
          </div>
          <div className="card-body">
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="h-10 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />
                ))}
              </div>
            ) : topProducts.length === 0 ? (
              <p className="text-center text-gray-400 py-8">No product data available</p>
            ) : (
              <div className="space-y-3">
                {topProducts.slice(0, 8).map((product, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <div className="w-7 h-7 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-primary-600">{idx + 1}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{product._id}</p>
                      <p className="text-xs text-gray-500">{product.totalQty} units sold</p>
                    </div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {formatRevenue(product.totalRevenue)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Customer Analytics */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">Customer Overview</h3>
          </div>
          <div className="card-body">
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="h-12 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />
                ))}
              </div>
            ) : !customerData ? (
              <p className="text-center text-gray-400 py-8">No customer data available</p>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Total Customers</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">{customerData.total || 0}</p>
                  </div>
                  <FiUsers className="w-8 h-8 text-primary-400" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-success-50 dark:bg-success-900/20 rounded-lg">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Active (30d)</p>
                    <p className="text-lg font-bold text-success-600">{customerData.activeCustomers || 0}</p>
                  </div>
                  <div className="p-3 bg-info-50 dark:bg-info-900/20 rounded-lg">
                    <p className="text-xs text-gray-500 dark:text-gray-400">New (30d)</p>
                    <p className="text-lg font-bold text-info-600">{customerData.newCustomers || 0}</p>
                  </div>
                  <div className="p-3 bg-warning-50 dark:bg-warning-900/20 rounded-lg">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Churned</p>
                    <p className="text-lg font-bold text-warning-600">{customerData.churned || 0}</p>
                  </div>
                  <div className="p-3 bg-violet-50 dark:bg-violet-900/20 rounded-lg">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Retention</p>
                    <p className="text-lg font-bold text-violet-600">{customerData.retentionRate || 0}%</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* System Info */}
      {systemHealth && (
        <div className="card">
          <div className="card-header">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <FiServer className="w-4 h-4" />
              System Health
            </h3>
          </div>
          <div className="card-body">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <FiClock className="w-5 h-5 text-primary-500" />
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Uptime</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {Math.floor(systemHealth.uptime / 3600)}h {Math.floor((systemHealth.uptime % 3600) / 60)}m
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <FiHardDrive className="w-5 h-5 text-primary-500" />
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Memory (RSS)</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {systemHealth.memory ? `${(systemHealth.memory.rss / 1024 / 1024).toFixed(0)} MB` : 'N/A'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <FiActivity className="w-5 h-5 text-primary-500" />
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Last Updated</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {systemHealth.timestamp ? new Date(systemHealth.timestamp).toLocaleString('en-IN') : 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
