import React, { useEffect, lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { getMe } from './store/slices/authSlice';

// Lazy-loaded pages for code splitting
const LoginPage = lazy(() => import('./pages/auth/LoginPage'));
const LandingPage = lazy(() => import('./pages/LandingPage'));
const TwoFactorPage = lazy(() => import('./pages/auth/TwoFactorPage'));
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/auth/ResetPasswordPage'));
const SuperAdminDashboard = lazy(() => import('./pages/super-admin/DashboardPage'));
const ShopsPage = lazy(() => import('./pages/super-admin/ShopsPage'));
const PreShopsPage = lazy(() => import('./pages/super-admin/PreShopsPage'));
const PlansPage = lazy(() => import('./pages/super-admin/PlansPage'));
const AnalyticsPage = lazy(() => import('./pages/super-admin/AnalyticsPage'));
const SuperAdminSettings = lazy(() => import('./pages/super-admin/SettingsPage'));
const RecycleBinPage = lazy(() => import('./pages/super-admin/RecycleBinPage'));
const ShopAdminDashboard = lazy(() => import('./pages/shop-admin/DashboardPage'));
const POSTerminal = lazy(() => import('./pages/pos/POSTerminal'));
const ProductsPage = lazy(() => import('./pages/products/ProductsPage'));
const CustomersPage = lazy(() => import('./pages/customers/CustomersPage'));
const OrdersPage = lazy(() => import('./pages/orders/OrdersPage'));
const InventoryPage = lazy(() => import('./pages/inventory/InventoryPage'));
const PurchasesPage = lazy(() => import('./pages/purchases/PurchasesPage'));
const ExpensesPage = lazy(() => import('./pages/expenses/ExpensesPage'));
const EmployeesPage = lazy(() => import('./pages/employees/EmployeesPage'));
const LoyaltyPage = lazy(() => import('./pages/loyalty/LoyaltyPage'));
const SuppliersPage = lazy(() => import('./pages/suppliers/SuppliersPage'));
const AlertsPage = lazy(() => import('./pages/settings/AlertsPage'));
const ReportsPage = lazy(() => import('./pages/reports/ReportsPage'));
const CrmPage = lazy(() => import('./pages/crm/CrmPage'));
const EcommercePage = lazy(() => import('./pages/ecommerce/EcommercePage'));
const SupportPage = lazy(() => import('./pages/support/SupportPage'));
const SettingsPage = lazy(() => import('./pages/settings/SettingsPage'));
const ShopBillingPage = lazy(() => import('./pages/shop-admin/ShopBillingPage'));
const TeamPage = lazy(() => import('./pages/team/TeamPage'));
const SignupPage = lazy(() => import('./pages/auth/SignupPage'));

// Layouts
const AppLayout = lazy(() => import('./components/layout/AppLayout'));

// Loading fallback
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
    <div className="flex flex-col items-center gap-3">
      <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary-500 border-t-transparent"></div>
      <p className="text-sm text-gray-500 dark:text-gray-400">Loading...</p>
    </div>
  </div>
);

// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { isAuthenticated, user, loading } = useSelector((state) => state.auth);

  if (loading) return <PageLoader />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (allowedRoles.length > 0 && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

// Shop Route: role + feature-based protection for shop-level routes.
// Redirects to dashboard if the feature is not enabled in the subscription plan.
const ShopRoute = ({ children, allowedRoles = [], requiredFeature }) => {
  const { user, shopFeatures } = useSelector((state) => state.auth);

  // Role check
  if (allowedRoles.length > 0 && user && !allowedRoles.includes(user.role)) {
    toast.error('You do not have access to this page');
    return <Navigate to="/" replace />;
  }

  // Feature check (only for shop admin / non-super-admin users)
  if (requiredFeature && shopFeatures && shopFeatures.features) {
    if (shopFeatures.features[requiredFeature] !== true) {
      toast.error('This feature is not included in your subscription plan');
      return <Navigate to="/" replace />;
    }
  }

  return children;
};

// ─── Root Route ───
// Shows the public LandingPage for unauthenticated users, 
// and the protected AppLayout for authenticated users.
function RootRoute() {
  const { isAuthenticated, user, loading } = useSelector((state) => state.auth);

  if (loading) return <PageLoader />;

  if (!isAuthenticated) {
    return <LandingPage />;
  }

  // Redirect super_admin to their dedicated dashboard
  if (user?.role === 'super_admin') {
    return <Navigate to="/super-admin" replace />;
  }

  return <AppLayout />;
}

export default function App() {
  const dispatch = useDispatch();
  const { isAuthenticated, token } = useSelector((state) => state.auth);

  // Fetch current user on mount if token exists
  useEffect(() => {
    if (token) {
      dispatch(getMe());
    }
  }, [dispatch, token]);

  // Apply saved theme on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'light';
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark');
    }
  }, []);

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/login/2fa" element={<TwoFactorPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        {/* Root Route: Landing Page (unauthenticated) or App (authenticated) */}
        <Route path="/" element={<RootRoute />}>
          {/* These child routes only work when RootRoute renders AppLayout (authenticated) */}
          <Route index element={<ShopAdminDashboard />} />
          <Route path="pos" element={<ShopRoute requiredFeature="pos"><POSTerminal /></ShopRoute>} />
          <Route path="products" element={<ProductsPage />} />
          <Route path="products/:id" element={<ProductsPage />} />
          <Route path="customers" element={<ShopRoute requiredFeature="crm"><CustomersPage /></ShopRoute>} />
          <Route path="orders" element={<OrdersPage />} />
          <Route path="orders/:id" element={<OrdersPage />} />
          <Route path="inventory" element={<ShopRoute allowedRoles={['shop_admin', 'manager']} requiredFeature="inventory"><InventoryPage /></ShopRoute>} />
          <Route path="purchases" element={<ShopRoute allowedRoles={['shop_admin', 'manager']} requiredFeature="purchases"><PurchasesPage /></ShopRoute>} />
          <Route path="expenses" element={<ShopRoute allowedRoles={['shop_admin', 'manager']} requiredFeature="expenses"><ExpensesPage /></ShopRoute>} />
          <Route path="team" element={<ShopRoute allowedRoles={['shop_admin']} requiredFeature="employees"><TeamPage /></ShopRoute>} />
          <Route path="employees" element={<ShopRoute allowedRoles={['shop_admin']} requiredFeature="employees"><EmployeesPage /></ShopRoute>} />
          <Route path="loyalty" element={<ShopRoute allowedRoles={['shop_admin']} requiredFeature="loyalty"><LoyaltyPage /></ShopRoute>} />
          <Route path="suppliers" element={<ShopRoute allowedRoles={['shop_admin', 'manager']} requiredFeature="suppliers"><SuppliersPage /></ShopRoute>} />
          <Route path="alerts" element={<ShopRoute allowedRoles={['shop_admin', 'manager']}><AlertsPage /></ShopRoute>} />
          <Route path="crm" element={<ShopRoute requiredFeature="crm"><CrmPage /></ShopRoute>} />
          <Route path="ecommerce" element={<ShopRoute requiredFeature="ecommerce"><EcommercePage /></ShopRoute>} />
          <Route path="support" element={<ShopRoute requiredFeature="customerSupport"><SupportPage /></ShopRoute>} />
          <Route path="reports" element={<ShopRoute allowedRoles={['shop_admin', 'manager']}><ReportsPage /></ShopRoute>} />
          <Route path="settings" element={<ShopRoute allowedRoles={['shop_admin']}><SettingsPage /></ShopRoute>} />
          <Route path="billing" element={<ShopBillingPage />} />
        </Route>

        {/* Super Admin Routes */}
        <Route path="/super-admin" element={
          <ProtectedRoute allowedRoles={['super_admin']}>
            <AppLayout />
          </ProtectedRoute>
        }>
          <Route index element={<SuperAdminDashboard />} />
          <Route path="shops" element={<ShopsPage />} />
          <Route path="pre-shops" element={<PreShopsPage />} />
          <Route path="plans" element={<PlansPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="settings" element={<SuperAdminSettings />} />
          <Route path="recycle-bin" element={<RecycleBinPage />} />
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
