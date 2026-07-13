import React, { useState, useEffect, useCallback } from 'react';
import {
  FiDownload, FiCalendar, FiTrendingUp, FiPackage,
  FiDollarSign, FiFileText, FiRefreshCw,
  FiBarChart2, FiArrowUp, FiArrowDown, FiPrinter
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, Legend
} from 'recharts';
import { apiService } from '../../services/api';

const COLORS = {
  primary: '#6366f1',
  green: '#22c55e',
  red: '#ef4444',
  amber: '#f59e0b',
  blue: '#3b82f6',
  purple: '#8b5cf6',
  cyan: '#06b6d4',
};

const CHART_COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6'];

const REPORT_TABS = [
  { id: 'sales', label: 'Sales Report', icon: FiTrendingUp },
  { id: 'inventory', label: 'Inventory Report', icon: FiPackage },
  { id: 'gst', label: 'GST Report', icon: FiFileText },
  { id: 'pnl', label: 'P&L Statement', icon: FiDollarSign },
];

const DATE_RANGES = [
  { label: 'Today', value: 'today' },
  { label: 'This Week', value: 'week' },
  { label: 'This Month', value: 'month' },
  { label: 'This Quarter', value: 'quarter' },
  { label: 'This Year', value: 'year' },
  { label: 'Custom', value: 'custom' },
];

function StatCard({ title, value, change, icon: Icon, color, loading }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-md transition-shadow">
      {loading ? (
        <div className="animate-pulse space-y-3">
          <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded-lg" />
          <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-6 w-28 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-3">
            <div className={`p-2.5 rounded-lg ${color}`}>
              <Icon className="w-5 h-5 text-white" />
            </div>
            {change !== undefined && (
              <span className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${
                change >= 0
                  ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400'
                  : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
              }`}>
                {change >= 0 ? <FiArrowUp className="w-3 h-3" /> : <FiArrowDown className="w-3 h-3" />}
                {Math.abs(change)}%
              </span>
            )}
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{value}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{title}</p>
        </>
      )}
    </div>
  );
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload) return null;
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3">
      <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="text-sm font-semibold" style={{ color: entry.color }}>
          {entry.name}: ₹{Number(entry.value).toLocaleString()}
        </p>
      ))}
    </div>
  );
}

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState('sales');
  const [dateRange, setDateRange] = useState('month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  // Sales report state
  const [salesView, setSalesView] = useState('daily');

  // Inventory report state
  const [inventoryFilter, setInventoryFilter] = useState('all');

  // GST report state
  const [gstFilter, setGstFilter] = useState('all');

  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (dateRange === 'custom' && customStart && customEnd) {
        params.startDate = customStart;
        params.endDate = customEnd;
      } else if (dateRange === 'today') {
        const today = new Date();
        params.startDate = today.toISOString().split('T')[0];
        params.endDate = today.toISOString().split('T')[0];
      } else if (dateRange === 'week') {
        const d = new Date();
        d.setDate(d.getDate() - 7);
        params.startDate = d.toISOString().split('T')[0];
        params.endDate = new Date().toISOString().split('T')[0];
      } else if (dateRange === 'month') {
        const d = new Date();
        d.setMonth(d.getMonth() - 1);
        params.startDate = d.toISOString().split('T')[0];
        params.endDate = new Date().toISOString().split('T')[0];
      } else if (dateRange === 'quarter') {
        const d = new Date();
        d.setMonth(d.getMonth() - 3);
        params.startDate = d.toISOString().split('T')[0];
        params.endDate = new Date().toISOString().split('T')[0];
      } else if (dateRange === 'year') {
        const d = new Date();
        d.setFullYear(d.getFullYear() - 1);
        params.startDate = d.toISOString().split('T')[0];
        params.endDate = new Date().toISOString().split('T')[0];
      }

      let response, reportData;
      switch (activeTab) {
        case 'sales': {
          params.groupBy = salesView === 'weekly' ? 'week' : salesView === 'monthly' ? 'month' : 'day';
          response = await apiService.getSalesReport(params);
          const body = response.data;
          reportData = {
            chartData: (body.data || []).map(d => ({ label: d._id, revenue: d.revenue })),
            totals: body.totals || {},
            stats: {
              totalSales: `₹${(body.totals?.revenue || 0).toLocaleString('en-IN')}`,
              totalOrders: body.totals?.orders || 0,
              averageOrder: `₹${body.totals?.orders ? Math.round(body.totals.revenue / body.totals.orders).toLocaleString('en-IN') : '0'}`,
              growth: 0,
            },
          };
          break;
        }
        case 'inventory': {
          response = await apiService.getInventoryReport();
          const body = response.data;
          reportData = {
            categories: body.data?.categories || [],
            products: body.data?.products || [],
            stats: {
              totalProducts: body.data?.summary?.totalProducts || 0,
              totalValue: `₹${(body.data?.summary?.totalValue || 0).toLocaleString('en-IN')}`,
              lowStock: body.data?.summary?.lowStock || 0,
              outOfStock: body.data?.summary?.outOfStock || 0,
            },
            chartData: (body.data?.categories || []).map(c => ({ label: c._id, stock: c.totalStock })),
          };
          break;
        }
        case 'gst': {
          response = await apiService.getGstReport(params);
          const body = response.data;
          const byType = body.data?.byType || [];
          const summary = body.data?.summary || {};
          reportData = {
            byType,
            summary,
            stats: {
              totalTaxable: `₹${(summary.taxable || 0).toLocaleString('en-IN')}`,
              totalGst: `₹${(summary.totalGst || 0).toLocaleString('en-IN')}`,
              cgst: `₹${(summary.cgst || 0).toLocaleString('en-IN')}`,
              sgst: `₹${(summary.sgst || 0).toLocaleString('en-IN')}`,
              igst: `₹${(summary.igst || 0).toLocaleString('en-IN')}`,
            },
            chartData: (body.data?.byType || []).map(t => ({ label: t._id || 'Regular', cgst: t.cgst || 0, sgst: t.sgst || 0, igst: t.igst || 0 })),
            gstBreakdown: (body.data?.byType || []).map(t => ({ rate: t._id === 'igst' ? 12 : 18, taxableValue: t.taxable || 0, cgst: t.cgst || 0, sgst: t.sgst || 0, totalTax: t.totalGst || 0 })),
          };
          break;
        }
        case 'pnl': {
          response = await apiService.getProfitLoss(params);
          const body = response.data;
          const d = body.data || {};
          const netProfit = d.netProfit || 0;
          const revenue = d.revenue || 0;
          reportData = {
            stats: {
              revenue: `₹${(revenue || 0).toLocaleString('en-IN')}`,
              expenses: `₹${(d.totalExpenses || 0).toLocaleString('en-IN')}`,
              grossProfit: `₹${(d.grossProfit || 0).toLocaleString('en-IN')}`,
              netProfit: `₹${(netProfit || 0).toLocaleString('en-IN')}`,
              margin: revenue > 0 ? `${((netProfit / revenue) * 100).toFixed(1)}%` : '0%',
            },
            chartData: (body.data?.monthlyData || []).map(m => ({ label: m._id, revenue: m.revenue || 0, expenses: m.expenses || 0, profit: (m.revenue || 0) - (m.expenses || 0) })),
            expenseCategories: (body.data?.expenseCategories || []).map(e => ({ category: e._id, amount: e.total || 0 })),
          };
          break;
        }
        default:
          reportData = {};
      }
      setData(reportData || {});
    } catch (err) {
      if (err.response?.status !== 404) {
        console.error('Reports fetch error:', err);
      }
      setError('Could not load report data. Some sections may be empty.');
      setData({});
    } finally {
      setLoading(false);
    }
  }, [activeTab, dateRange, customStart, customEnd, salesView, inventoryFilter, gstFilter]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleExport = async (format = 'excel') => {
    try {
      toast('Export feature will be available soon');
    } catch (err) {
      console.error('Export error:', err);
    }
  };

  const renderSalesReport = () => {
    const stats = data?.stats || {
      totalSales: '₹0',
      totalOrders: 0,
      averageOrder: '₹0',
      growth: 12,
    };
    const chartData = data?.chartData || [];

    return (
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard
            title="Total Sales"
            value={stats.totalSales}
            change={stats.growth}
            icon={FiDollarSign}
            color="bg-indigo-500"
            loading={loading}
          />
          <StatCard
            title="Total Orders"
            value={stats.totalOrders}
            icon={FiTrendingUp}
            color="bg-green-500"
            loading={loading}
          />
          <StatCard
            title="Avg Order Value"
            value={stats.averageOrder}
            icon={FiBarChart2}
            color="bg-amber-500"
            loading={loading}
          />
          <StatCard
            title="Returns"
            value={stats.returns || '₹0'}
            change={stats.returnsGrowth}
            icon={FiArrowDown}
            color="bg-red-500"
            loading={loading}
          />
        </div>

        {/* Sales Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Sales Trend</h3>
            <div className="flex gap-2">
              {['daily', 'weekly', 'monthly'].map((view) => (
                <button
                  key={view}
                  onClick={() => setSalesView(view)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                    salesView === view
                      ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                      : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  {view.charAt(0).toUpperCase() + view.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="label" stroke="#9ca3af" fontSize={12} />
                <YAxis stroke="#9ca3af" fontSize={12} />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke={COLORS.primary}
                  fill="url(#salesGradient)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Products & Payment Methods */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Top Products</h3>
            {data?.topProducts && data.topProducts.length > 0 ? (
              <div className="space-y-3">
                {data.topProducts.map((product, i) => (
                  <div key={product._id || i} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-gray-400 w-6">{i + 1}.</span>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{product.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{product.quantity} sold</p>
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">₹{product.revenue?.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                <FiPackage className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No product data yet</p>
                <p className="text-xs mt-1">Real-time top products will appear here</p>
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Payment Methods</h3>
            {data?.paymentMethods && data.paymentMethods.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.paymentMethods}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {data.paymentMethods.map((entry, i) => (
                        <Cell key={`cell-${i}`} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-400">
                <FiDollarSign className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No payment data yet</p>
                <p className="text-xs mt-1">Payment method breakdown will appear here</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderInventoryReport = () => {
    const stats = data?.stats || {
      totalProducts: 0,
      totalValue: '₹0',
      lowStock: 0,
      outOfStock: 0,
    };
    const chartData = data?.chartData || [];

    return (
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard title="Total Products" value={stats.totalProducts} icon={FiPackage} color="bg-indigo-500" loading={loading} />
          <StatCard title="Stock Value" value={stats.totalValue} icon={FiDollarSign} color="bg-green-500" loading={loading} />
          <StatCard title="Low Stock Items" value={stats.lowStock} icon={FiArrowDown} color="bg-amber-500" loading={loading} />
          <StatCard title="Out of Stock" value={stats.outOfStock} icon={FiPackage} color="bg-red-500" loading={loading} />
        </div>

        {/* Category Distribution & Stock Value */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Stock by Category</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="label" stroke="#9ca3af" fontSize={12} />
                  <YAxis stroke="#9ca3af" fontSize={12} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="stock" fill={COLORS.primary} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Stock Health</h3>
            <div className="space-y-4">
              {[
                { label: 'In Stock', value: stats.totalProducts - stats.lowStock - stats.outOfStock, color: 'bg-green-500', max: stats.totalProducts || 100 },
                { label: 'Low Stock', value: stats.lowStock, color: 'bg-amber-500', max: stats.totalProducts || 100 },
                { label: 'Out of Stock', value: stats.outOfStock, color: 'bg-red-500', max: stats.totalProducts || 100 },
              ].map((item) => (
                <div key={item.label}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600 dark:text-gray-400">{item.label}</span>
                    <span className="font-medium text-gray-900 dark:text-white">{item.value}</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                    <div
                      className={`h-2.5 rounded-full transition-all duration-500 ${item.color}`}
                      style={{ width: `${(item.value / item.max) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderGstReport = () => {
    const stats = data?.stats || {
      totalTaxable: '₹0',
      totalGst: '₹0',
      cgst: '₹0',
      sgst: '₹0',
      igst: '₹0',
    };
    const chartData = data?.chartData || [];

    return (
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <StatCard title="Taxable Value" value={stats.totalTaxable} icon={FiFileText} color="bg-indigo-500" loading={loading} />
          <StatCard title="Total GST" value={stats.totalGst} icon={FiDollarSign} color="bg-green-500" loading={loading} />
          <StatCard title="CGST" value={stats.cgst} icon={FiBarChart2} color="bg-blue-500" loading={loading} />
          <StatCard title="SGST" value={stats.sgst} icon={FiBarChart2} color="bg-purple-500" loading={loading} />
          <StatCard title="IGST" value={stats.igst} icon={FiBarChart2} color="bg-cyan-500" loading={loading} />
        </div>

        {/* GST Breakdown Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">GST Collection by Rate</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="label" stroke="#9ca3af" fontSize={12} />
                <YAxis stroke="#9ca3af" fontSize={12} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="cgst" fill={COLORS.blue} radius={[4, 4, 0, 0]} name="CGST" />
                <Bar dataKey="sgst" fill={COLORS.purple} radius={[4, 4, 0, 0]} name="SGST" />
                <Bar dataKey="igst" fill={COLORS.cyan} radius={[4, 4, 0, 0]} name="IGST" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* GST Summary Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">GST Summary</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700/50">
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">GST Rate</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Taxable Value</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">CGST</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">SGST</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Total Tax</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {(data?.gstBreakdown || []).map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{row.rate}%</td>
                    <td className="px-4 py-3 text-sm text-right text-gray-900 dark:text-white">₹{row.taxableValue?.toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm text-right text-blue-600 dark:text-blue-400">₹{row.cgst?.toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm text-right text-purple-600 dark:text-purple-400">₹{row.sgst?.toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900 dark:text-white">₹{row.totalTax?.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderPnlReport = () => {
    const stats = data?.stats || {
      revenue: '₹0',
      expenses: '₹0',
      grossProfit: '₹0',
      netProfit: '₹0',
      margin: '0%',
    };
    const chartData = data?.chartData || [];

    return (
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard title="Revenue" value={stats.revenue} icon={FiTrendingUp} color="bg-green-500" loading={loading} />
          <StatCard title="Expenses" value={stats.expenses} icon={FiArrowDown} color="bg-red-500" loading={loading} />
          <StatCard title="Gross Profit" value={stats.grossProfit} icon={FiDollarSign} color="bg-indigo-500" loading={loading} />
          <StatCard title="Net Profit" value={stats.netProfit} icon={FiDollarSign} color="bg-green-500" loading={loading} />
          <StatCard title="Profit Margin" value={stats.margin} icon={FiBarChart2} color="bg-amber-500" loading={loading} />
        </div>

        {/* P&L Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Revenue vs Expenses</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="label" stroke="#9ca3af" fontSize={12} />
                <YAxis stroke="#9ca3af" fontSize={12} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar dataKey="revenue" fill={COLORS.green} radius={[4, 4, 0, 0]} name="Revenue" />
                <Bar dataKey="expenses" fill={COLORS.red} radius={[4, 4, 0, 0]} name="Expenses" />
                <Bar dataKey="profit" fill={COLORS.primary} radius={[4, 4, 0, 0]} name="Net Profit" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Expense Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Expense Categories</h3>
            <div className="space-y-3">
              {(data?.expenseCategories || []).map((expense, i) => (
                <div key={i} className="flex items-center justify-between py-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">{expense.category}</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">₹{expense.amount?.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Profit Trend</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="label" stroke="#9ca3af" fontSize={12} />
                  <YAxis stroke="#9ca3af" fontSize={12} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="profit" stroke={COLORS.green} strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderActiveReport = () => {
    switch (activeTab) {
      case 'sales': return renderSalesReport();
      case 'inventory': return renderInventoryReport();
      case 'gst': return renderGstReport();
      case 'pnl': return renderPnlReport();
      default: return null;
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reports</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Analyze your business performance with detailed reports
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleExport('excel')}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <FiDownload className="w-4 h-4" />
            Export Excel
          </button>
          <button
            onClick={() => handleExport('pdf')}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <FiPrinter className="w-4 h-4" />
            Export PDF
          </button>
          <button
            onClick={fetchReports}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Report Tabs */}
      <div className="flex flex-wrap gap-2">
        {REPORT_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-all ${
              activeTab === tab.id
                ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Date Range Filter */}
      <div className="flex flex-wrap items-center gap-3">
        <FiCalendar className="w-4 h-4 text-gray-400" />
        {DATE_RANGES.map((range) => (
          <button
            key={range.value}
            onClick={() => setDateRange(range.value)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              dateRange === range.value
                ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {range.label}
          </button>
        ))}
        {dateRange === 'custom' && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
            <span className="text-gray-400">to</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
        )}
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-4 text-sm text-amber-700 dark:text-amber-400">
          {error} — showing sample data for preview.
        </div>
      )}

      {/* Report Content */}
      {renderActiveReport()}
    </div>
  );
}

// Demo data removed — all reports now use real-time API data
