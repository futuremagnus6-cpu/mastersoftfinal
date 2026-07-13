import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  FiShoppingCart, FiDollarSign, FiPackage, FiUsers, FiBox,
  FiTrendingUp, FiTrendingDown, FiRefreshCw, FiAlertTriangle,
  FiClock, FiEye, FiArrowRight, FiPlus, FiPrinter,
  FiBarChart2, FiSettings, FiShoppingBag, FiTruck, FiCheckCircle,
} from 'react-icons/fi';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, AreaChart, Area,
} from 'recharts';
import { apiService } from '../../services/api';
import toast from 'react-hot-toast';

// ─── Stat Card ───
function StatCard({ title, value, subtitle, icon: Icon, color, loading, trend }) {
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
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
        {trend !== undefined && (
          <div className={`flex items-center gap-1 text-xs mt-0.5 ${trend >= 0 ? 'text-success-600' : 'text-danger-600'}`}>
            {trend >= 0 ? <FiTrendingUp className="w-3 h-3" /> : <FiTrendingDown className="w-3 h-3" />}
            <span>{Math.abs(trend)}% from yesterday</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Recent Order Row ───
function OrderRow({ order }) {
  const statusColors = {
    completed: 'badge-success',
    pending: 'badge-warning',
    cancelled: 'badge-danger',
    returned: 'badge-info',
  };

  const paymentColors = {
    completed: 'badge-success',
    pending: 'badge-warning',
    partial: 'badge-info',
    refunded: 'badge-danger',
  };

  return (
    <Link to={`/orders/${order._id}`} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
          <FiShoppingCart className="w-4 h-4 text-primary-600" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
            {order.orderNumber || 'Order'}
          </p>
          <p className="text-xs text-gray-500">{order.customerName || 'Walk-in'}</p>
        </div>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        <span className={statusColors[order.status]}>{order.status}</span>
        <span className={paymentColors[order.paymentStatus]}>{order.paymentStatus}</span>
        <span className="text-sm font-medium text-gray-900 dark:text-white">
          ₹{(order.grandTotal || 0).toLocaleString('en-IN')}
        </span>
        <FiEye className="w-4 h-4 text-gray-400" />
      </div>
    </Link>
  );
}

// ─── Low Stock Product Row ───
function LowStockRow({ product }) {
  const stockPercent = product.inventory?.minStockLevel > 0
    ? (product.inventory.quantity / product.inventory.minStockLevel * 100).toFixed(0)
    : 0;

  return (
    <div className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 bg-danger-100 dark:bg-danger-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
          <FiAlertTriangle className="w-4 h-4 text-danger-600" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{product.name}</p>
          <p className="text-xs text-gray-500">SKU: {product.sku}</p>
        </div>
      </div>
      <div className="text-right flex-shrink-0">
        <p className={`text-sm font-bold ${product.inventory?.quantity === 0 ? 'text-danger-600' : 'text-warning-600'}`}>
          {product.inventory?.quantity || 0} units
        </p>
        <div className="w-20 h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full mt-1 ml-auto">
          <div
            className={`h-full rounded-full ${stockPercent <= 25 ? 'bg-danger-500' : 'bg-warning-500'}`}
            style={{ width: `${Math.min(stockPercent, 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Sales Trend Chart ───
function SalesChart({ data, loading }) {
  if (loading) return <div className="h-64 bg-gray-100 dark:bg-gray-700 rounded-lg animate-pulse" />;
  if (!data?.length) return <div className="h-64 flex items-center justify-center text-gray-400">No sales data</div>;

  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
        <XAxis dataKey="_id" stroke="#9ca3af" fontSize={11} tickLine={false} />
        <YAxis stroke="#9ca3af" fontSize={11} tickLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
        <Tooltip
          contentStyle={{ background: '#1e293b', border: 'none', borderRadius: '8px', color: '#f8fafc', fontSize: '12px' }}
          formatter={(value) => [`₹${value.toLocaleString('en-IN')}`, 'Revenue']}
        />
        <Area type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={2} fill="url(#revenueGradient)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ─── Main Component ───
export default function ShopAdminDashboard() {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [salesTrend, setSalesTrend] = useState([]);
  const [error, setError] = useState(null);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Main dashboard data
      const dashRes = await apiService.getShopDashboard();
      const dashData = dashRes.data?.data || dashRes.data || {};

      // Orders & low stock
      const [ordersRes, stockRes] = await Promise.all([
        apiService.getOrders({ limit: 10 }).catch(() => ({ data: { data: [] } })),
        apiService.getStockSummary().catch(() => ({ data: { data: { lowStock: 0 } } })),
      ]);

      setDashboard(dashData);
      setRecentOrders(ordersRes.data?.data || []);
      setSalesTrend(dashData.salesTrend || []);
      setLowStockProducts(dashData.lowStockProducts || []);
    } catch (err) {
      console.error('Dashboard load error:', err);
      setError('Failed to load dashboard. Using demo data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  // Format today's revenue
  const todayRevenue = dashboard?.todayRevenue || 0;
  const monthRevenue = dashboard?.monthRevenue || 0;
  const monthExpenses = dashboard?.monthExpenses || 0;
  const netProfit = monthRevenue - monthExpenses;

  const quickActions = [
    { label: 'New Sale', icon: FiShoppingCart, path: '/pos', color: 'bg-primary-600' },
    { label: 'Add Product', icon: FiBox, path: '/products', color: 'bg-success-500' },
    { label: 'New Customer', icon: FiUsers, path: '/customers', color: 'bg-warning-500' },
    { label: 'Create Purchase', icon: FiTruck, path: '/purchases', color: 'bg-info-500' },
    { label: 'Reports', icon: FiBarChart2, path: '/reports', color: 'bg-violet-500' },
    { label: 'Settings', icon: FiSettings, path: '/settings', color: 'bg-gray-500' },
  ];

  return (
    <div className="page-container">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Welcome, {user?.name?.split(' ')[0] || 'User'} 👋
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Here's what's happening with your business today.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={loadDashboard} disabled={loading} className="btn-secondary flex items-center gap-2">
            <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <Link to="/pos" className="btn-primary flex items-center gap-2">
            <FiShoppingCart className="w-4 h-4" />
            Open POS
          </Link>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-3 bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-800 rounded-lg">
          <p className="text-sm text-warning-600 dark:text-warning-400">{error}</p>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4 mb-6">
        <StatCard title="Today's Orders" value={dashboard?.todayOrders || 0} loading={loading} icon={FiShoppingCart} color="bg-primary-600" />
        <StatCard title="Today's Revenue" value={`₹${todayRevenue.toLocaleString('en-IN')}`} loading={loading} icon={FiDollarSign} color="bg-success-500" />
        <StatCard title="This Month" value={`₹${monthRevenue.toLocaleString('en-IN')}`} subtitle={`Expenses: ₹${monthExpenses.toLocaleString('en-IN')}`} loading={loading} icon={FiTrendingUp} color="bg-warning-500" />
        <StatCard title="Net Profit" value={`₹${netProfit.toLocaleString('en-IN')}`} loading={loading} icon={FiPackage} color={netProfit >= 0 ? 'bg-info-500' : 'bg-danger-500'} />
        <StatCard title="Products" value={dashboard?.totalProducts || 0} loading={loading} icon={FiBox} color="bg-violet-500" />
        <StatCard title="Customers" value={dashboard?.totalCustomers || 0} loading={loading} icon={FiUsers} color="bg-rose-500" />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Sales Chart */}
        <div className="card lg:col-span-2">
          <div className="card-header flex items-center justify-between">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">Sales Trend (Last 30 Days)</h3>
            <Link to="/reports" className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 flex items-center gap-1">
              Full Report <FiArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="card-body">
            <SalesChart data={salesTrend} loading={loading} />
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">Quick Actions</h3>
            </div>
            <div className="card-body grid grid-cols-2 gap-3">
              {quickActions.map((action, i) => (
                <Link
                  key={i}
                  to={action.path}
                  className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all group"
                >
                  <div className={`w-10 h-10 ${action.color} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
                    <action.icon className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-400">{action.label}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Inventory Summary */}
          <div className="card">
            <div className="card-header flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">Inventory Summary</h3>
            </div>
            <div className="card-body space-y-3">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-10 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />
                ))
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Total Products</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{dashboard?.totalProducts || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Low Stock Items</span>
                    <span className="text-sm font-medium text-warning-600">{dashboard?.lowStock || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Out of Stock</span>
                    <span className="text-sm font-medium text-danger-600">{dashboard?.outOfStock || 0}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row: Recent Orders + Low Stock */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">Recent Orders</h3>
            <Link to="/orders" className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 flex items-center gap-1">
              View All <FiArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y dark:divide-gray-700">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="px-4 py-3">
                  <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-3/4" />
                </div>
              ))
            ) : recentOrders.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                <FiShoppingCart className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No orders yet</p>
                <Link to="/pos" className="text-primary-600 text-sm font-medium mt-1 inline-block">
                  Create your first sale
                </Link>
              </div>
            ) : (
              recentOrders.map((order) => (
                <OrderRow key={order._id} order={order} />
              ))
            )}
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">Low Stock Alerts</h3>
            <Link to="/inventory" className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 flex items-center gap-1">
              Manage Stock <FiArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y dark:divide-gray-700">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="px-4 py-3">
                  <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-2/3" />
                </div>
              ))
            ) : lowStockProducts.length === 0 && (dashboard?.lowStock || 0) === 0 ? (
              <div className="text-center py-10 text-gray-400">
                <FiCheckCircle className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">All products are well-stocked</p>
              </div>
            ) : lowStockProducts.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                <FiAlertTriangle className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">{dashboard?.lowStock || 0} products need attention</p>
                <Link to="/inventory" className="text-primary-600 text-sm font-medium mt-1 inline-block">
                  View in Inventory
                </Link>
              </div>
            ) : (
              lowStockProducts.map((product) => (
                <LowStockRow key={product._id} product={product} />
              ))
            )}
          </div>

          {/* Today Summary */}
          <div className="border-t dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-900 rounded-b-xl">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Today's Summary</span>
              <span className="text-gray-700 dark:text-gray-300 font-medium">
                {dashboard?.todayOrders || 0} orders · ₹{(dashboard?.todayRevenue || 0).toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Quick POS Access */}
      <div className="fixed bottom-6 right-6 lg:hidden">
        <Link
          to="/pos"
          className="w-14 h-14 bg-primary-600 rounded-full shadow-lg flex items-center justify-center text-white hover:bg-primary-700 transition-all hover:scale-110 active:scale-95"
        >
          <FiShoppingCart className="w-6 h-6" />
        </Link>
      </div>
    </div>
  );
}
