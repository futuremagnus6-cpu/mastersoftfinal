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
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, AreaChart, Area, ReferenceLine,
} from 'recharts';
import { apiService } from '../../services/api';
import toast from 'react-hot-toast';

// ─── Stat Card ───
function StatCard({ title, value, subtitle, icon: Icon, color, loading, trend, sparklineData }) {
  return (
    <div className="stat-card animate-fade-in group relative overflow-hidden !p-3 sm:!p-4">
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${color} shadow-lg shadow-current/20`}>
        <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
      </div>
      <div className="flex-1 min-w-0 overflow-hidden">
        <p className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 truncate">{title}</p>
        {loading ? (
          <div className="h-6 sm:h-7 w-16 sm:w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mt-0.5" />
        ) : (
          <p className="text-sm sm:text-base lg:text-lg font-bold text-gray-900 dark:text-white truncate">{value}</p>
        )}
        {subtitle && <p className="text-[11px] sm:text-xs text-gray-400 mt-0.5 truncate">{subtitle}</p>}
        {trend !== undefined && (
          <div className={`flex items-center gap-1 text-[11px] sm:text-xs mt-0.5 ${trend >= 0 ? 'text-success-600' : 'text-danger-600'}`}>
            {trend >= 0 ? <FiTrendingUp className="w-3 h-3 flex-shrink-0" /> : <FiTrendingDown className="w-3 h-3 flex-shrink-0" />}
            <span className="truncate">{Math.abs(trend)}% from yesterday</span>
          </div>
        )}
        {sparklineData && sparklineData.length > 1 && (
          <div className="mt-1 hidden lg:block">
            <Sparkline data={sparklineData} loading={loading} />
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

// ─── Custom Tooltip ───
const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl backdrop-blur-xl px-4 py-3 min-w-[160px]">
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">{label}</p>
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center justify-between gap-6 py-0.5">
          <div className="flex items-center gap-2">
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-xs text-gray-600 dark:text-gray-300">{entry.name}</span>
          </div>
          <span className="text-xs font-semibold text-gray-900 dark:text-white">
            {entry.name === 'Orders' ? entry.value : `₹${entry.value.toLocaleString('en-IN')}`}
          </span>
        </div>
      ))}
    </div>
  );
};

// ─── Custom Active Dot ───
const CustomDot = ({ cx, cy, fill }) => {
  if (!cx || !cy) return null;
  return (
    <g>
      <circle cx={cx} cy={cy} r={6} fill={fill} opacity={0.15} />
      <circle cx={cx} cy={cy} r={4} fill={fill} stroke="#fff" strokeWidth={2} />
    </g>
  );
};

// ─── Professional Sales Trend Chart ───
function SalesChart({ data, loading }) {
  if (loading) return (
    <div className="h-72 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-xl animate-pulse" />
  );
  if (!data?.length) return (
    <div className="h-72 flex items-center justify-center text-gray-400 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-xl">
      <div className="text-center">
        <FiTrendingUp className="w-10 h-10 mx-auto mb-2 opacity-40" />
        <p className="text-sm">No sales data yet</p>
      </div>
    </div>
  );

  const avgRevenue = Math.round(data.reduce((s, d) => s + d.revenue, 0) / data.length);

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366f1" stopOpacity={0.25} />
            <stop offset="50%" stopColor="#6366f1" stopOpacity={0.10} />
            <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="ordersGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22c55e" stopOpacity={0.15} />
            <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
          </linearGradient>

        </defs>
        <CartesianGrid strokeDasharray="4 4" stroke="#e5e7eb" strokeOpacity={0.5} vertical={false} />
        <XAxis
          dataKey="_id"
          stroke="#9ca3af"
          fontSize={11}
          tickLine={false}
          axisLine={{ stroke: '#e5e7eb', strokeOpacity: 0.5 }}
          tickFormatter={(val) => {
            const d = new Date(val);
            return `${d.getDate()} ${d.toLocaleString('en', { month: 'short' })}`;
          }}
        />
        <YAxis
          yAxisId="revenue"
          stroke="#9ca3af"
          fontSize={11}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
        />
        <YAxis
          yAxisId="orders"
          orientation="right"
          stroke="#9ca3af"
          fontSize={11}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => `${v}`}
        />
        <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#6366f1', strokeDasharray: '4 4', strokeWidth: 1 }} />
        <ReferenceLine
          yAxisId="revenue"
          y={avgRevenue}
          stroke="#6366f1"
          strokeOpacity={0.3}
          strokeDasharray="6 6"
          label={{
            value: `Avg ₹${(avgRevenue / 1000).toFixed(0)}k`,
            position: 'insideTopRight',
            fill: '#6366f1',
            fontSize: 10,
            fontWeight: 500,
          }}
        />
        <Area
          yAxisId="revenue"
          type="monotone"
          dataKey="revenue"
          stroke="#6366f1"
          strokeWidth={2.5}
          fill="url(#revenueGradient)"
          dot={false}
          activeDot={<CustomDot fill="#6366f1" />}
          name="Revenue"
        />
        <Area
          yAxisId="orders"
          type="monotone"
          dataKey="orders"
          stroke="#22c55e"
          strokeWidth={2}
          fill="url(#ordersGradient)"
          dot={false}
          activeDot={<CustomDot fill="#22c55e" />}
          name="Orders"
          strokeDasharray="4 2"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ─── Daily Orders Bar Chart ───
function OrdersBarChart({ data, loading }) {
  if (loading) return (
    <div className="h-48 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-xl animate-pulse" />
  );
  if (!data?.length) return (
    <div className="h-48 flex items-center justify-center text-gray-400">
      <p className="text-sm">No order data</p>
    </div>
  );

  // Take last 7 days for weekly view
  const weeklyData = data.slice(-7);

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={weeklyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366f1" stopOpacity={0.85} />
            <stop offset="100%" stopColor="#6366f1" stopOpacity={0.45} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="4 4" stroke="#e5e7eb" strokeOpacity={0.4} vertical={false} />
        <XAxis
          dataKey="_id"
          stroke="#9ca3af"
          fontSize={10}
          tickLine={false}
          axisLine={{ stroke: '#e5e7eb', strokeOpacity: 0.5 }}
          tickFormatter={(val) => {
            const d = new Date(val);
            return d.toLocaleString('en', { weekday: 'short' });
          }}
        />
        <YAxis stroke="#9ca3af" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: '#6366f1', opacity: 0.06 }} />
        <Bar
          dataKey="orders"
          fill="url(#barGradient)"
          radius={[4, 4, 0, 0]}
          name="Orders"
          maxBarSize={40}
          animationBegin={0}
          animationDuration={800}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ─── Mini Sparkline ───
function Sparkline({ data, loading }) {
  if (loading || !data?.length) return null;
  const values = data.map(d => d.revenue || 0);
  if (values.length < 2) return null;
  const max = Math.max(...values) || 1;
  const min = Math.min(...values) || 0;
  const range = max - min || 1;
  const width = 72;
  const height = 24;
  const points = values.map((v, i) => {
    const x = (i / (values.length - 1)) * width;
    const y = height - ((v - min) / range) * height + 2;
    return `${x},${y}`;
  }).join(' ');
  const areaPoints = `0,${height + 2} ${points} ${width},${height + 2}`;
  return (
    <svg width={width} height={height + 4} className="flex-shrink-0" viewBox={`0 0 ${width} ${height + 4}`}>
      <polygon
        fill="#6366f1"
        fillOpacity={0.1}
        points={areaPoints}
      />
      <polyline
        fill="none"
        stroke="#6366f1"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
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
      {/* Page Header Card */}
      <div className="card p-5 mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/20">
            <FiBarChart2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900 dark:text-white">
              Welcome, {user?.name?.split(' ')[0] || 'User'} 👋
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Here's what's happening with your business today.
            </p>
          </div>
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-6">
        <StatCard title="Today's Orders" value={dashboard?.todayOrders || 0} loading={loading} icon={FiShoppingCart} color="bg-primary-600" sparklineData={salesTrend} />
        <StatCard title="Today's Revenue" value={`₹${todayRevenue.toLocaleString('en-IN')}`} loading={loading} icon={FiDollarSign} color="bg-success-500" sparklineData={salesTrend} />
        <StatCard title="This Month" value={`₹${monthRevenue.toLocaleString('en-IN')}`} subtitle={`Expenses: ₹${monthExpenses.toLocaleString('en-IN')}`} loading={loading} icon={FiTrendingUp} color="bg-warning-500" sparklineData={salesTrend} />
        <StatCard title="Net Profit" value={`₹${netProfit.toLocaleString('en-IN')}`} loading={loading} icon={FiPackage} color={netProfit >= 0 ? 'bg-info-500' : 'bg-danger-500'} sparklineData={salesTrend} />
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

          {/* Weekly Orders Chart */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">Weekly Orders</h3>
            </div>
            <div className="card-body">
              <OrdersBarChart data={salesTrend} loading={loading} />
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
