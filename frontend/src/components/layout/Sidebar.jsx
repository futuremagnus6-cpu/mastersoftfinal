import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  FiGrid, FiShoppingCart, FiBox, FiUsers, FiPackage,
  FiTruck, FiShoppingBag, FiDollarSign, FiBarChart2,
  FiSettings, FiUserCheck, FiGift, FiAlertCircle,
  FiLogOut, FiChevronDown, FiChevronLeft, FiShield,
  FiTrendingUp, FiHeadphones, FiLayers, FiClock, FiGlobe, FiTrash2,
  FiMessageSquare,
} from 'react-icons/fi';
import { getEnabledMenuItems } from '../../utils/features';
import { apiService } from '../../services/api';

const shopMenuItems = [
  { path: '/', icon: FiGrid, label: 'Dashboard', roles: ['shop_admin', 'manager', 'staff'] },
  { path: '/pos', icon: FiShoppingCart, label: 'POS Terminal', roles: ['shop_admin', 'manager', 'staff'], feature: 'pos' },
  { path: '/products', icon: FiBox, label: 'Products', roles: ['shop_admin', 'manager', 'staff'] },
  { path: '/orders', icon: FiPackage, label: 'Orders', roles: ['shop_admin', 'manager', 'staff'] },
  { path: '/customers', icon: FiUsers, label: 'Customers', roles: ['shop_admin', 'manager', 'staff'], feature: 'crm' },
  { path: '/crm', icon: FiUsers, label: 'CRM', roles: ['shop_admin', 'manager', 'staff'], feature: 'crm' },
  { path: '/inventory', icon: FiLayers, label: 'Inventory', roles: ['shop_admin', 'manager'], feature: 'inventory' },
  { path: '/suppliers', icon: FiTruck, label: 'Suppliers', roles: ['shop_admin', 'manager'], feature: 'suppliers' },
  { path: '/purchases', icon: FiShoppingBag, label: 'Purchases', roles: ['shop_admin', 'manager'], feature: 'purchases' },
  { path: '/expenses', icon: FiDollarSign, label: 'Expenses', roles: ['shop_admin', 'manager'], feature: 'expenses' },
  { path: '/team', icon: FiUserCheck, label: 'Team', roles: ['shop_admin'], feature: 'employees' },
  { path: '/employees', icon: FiUsers, label: 'Employees', roles: ['shop_admin'], feature: 'employees' },
  { path: '/loyalty', icon: FiGift, label: 'Loyalty', roles: ['shop_admin'], feature: 'loyalty' },
  { path: '/ecommerce', icon: FiGlobe, label: 'E-Commerce', roles: ['shop_admin'], feature: 'ecommerce' },
  { path: '/support', icon: FiHeadphones, label: 'Support', roles: ['shop_admin', 'manager', 'staff'], feature: 'customerSupport' },
  { path: '/reports', icon: FiBarChart2, label: 'Reports', roles: ['shop_admin', 'manager'] },
  { path: '/alerts', icon: FiAlertCircle, label: 'Alerts', roles: ['shop_admin', 'manager'] },
  { path: '/billing', icon: FiDollarSign, label: 'Billing', roles: ['shop_admin'] },
  { path: '/settings', icon: FiSettings, label: 'Settings', roles: ['shop_admin'] },
  { path: '/chat', icon: FiMessageSquare, label: 'Chat', roles: ['shop_admin', 'manager', 'staff'] },
];

const superAdminMenuItems = [
  { path: '/super-admin', icon: FiGrid, label: 'Dashboard', roles: ['super_admin'] },
  { path: '/super-admin/shops', icon: FiShoppingBag, label: 'Shops', roles: ['super_admin'] },
  { path: '/super-admin/pre-shops', icon: FiClock, label: 'Pre-Shops', roles: ['super_admin'] },
  { path: '/super-admin/expenses', icon: FiDollarSign, label: 'Expenses', roles: ['super_admin'] },
  { path: '/super-admin/recycle-bin', icon: FiTrash2, label: 'Recycle Bin', roles: ['super_admin'] },
  { path: '/super-admin/plans', icon: FiTrendingUp, label: 'Plans', roles: ['super_admin'] },
  { path: '/super-admin/analytics', icon: FiBarChart2, label: 'Analytics', roles: ['super_admin'] },
  { path: '/super-admin/settings', icon: FiSettings, label: 'Settings', roles: ['super_admin'] },
  { path: '/super-admin/chat', icon: FiMessageSquare, label: 'Chat', roles: ['super_admin'] },
];

export default function Sidebar({ collapsed, onToggle, onNavClick }) {
  const { user, shopFeatures } = useSelector((state) => state.auth);
  const location = useLocation();
  const isSuperAdmin = user?.role === 'super_admin';
  const isAuthenticated = !!user;
  const menuItems = isSuperAdmin ? superAdminMenuItems : shopMenuItems;

  // Poll for unread chat count
  const [chatUnread, setChatUnread] = useState(0);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchUnread = async () => {
      try {
        const res = await apiService.get('/chat/unread-count');
        setChatUnread(res.data?.data?.totalUnread || 0);
      } catch {}
    };

    fetchUnread();
    intervalRef.current = setInterval(fetchUnread, 15000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isAuthenticated]);

  // Reset unread when clicking chat
  const handleChatClick = () => {
    setChatUnread(0);
    if (onNavClick) onNavClick();
  };

  // Filter menu items by user role and subscription features
  let filteredItems = menuItems.filter((item) => item.roles.includes(user?.role));
  if (!isSuperAdmin) {
    filteredItems = getEnabledMenuItems(filteredItems, shopFeatures);
  }

  return (
    <aside
      className={`fixed left-0 top-0 h-full bg-white dark:bg-gray-800 border-r dark:border-gray-700 z-30 transition-all duration-300 flex flex-col ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Logo — click to toggle sidebar */}
      <button
        onClick={onToggle}
        className={`flex items-center h-16 border-b dark:border-gray-700 px-4 w-full transition-colors hover:bg-gray-50          dark:hover:bg-gray-700/50 ${
          collapsed ? 'justify-center' : 'justify-between'
        }`}
      >
        {!collapsed && (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <FiShield className="w-4 h-4 text-white" />
            </div>
            <div className="text-left">
              <p className="text-sm font-bold text-gray-900 dark:text-white">FutureMagnus</p>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 -mt-0.5">Business OS</p>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <FiShield className="w-4 h-4 text-white" />
          </div>
        )}
      </button>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
        {filteredItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path ||
            (item.path !== '/' && location.pathname.startsWith(item.path));

          const isChatItem = item.path === '/chat' || item.path === '/super-admin/chat';
          const showBadge = isChatItem && chatUnread > 0;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={isChatItem ? handleChatClick : onNavClick}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-400'
                  : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700/50'
              } ${collapsed ? 'justify-center px-2' : ''}`}
            >
              <div className="relative flex-shrink-0">
                <Icon className="w-5 h-5" />
                {showBadge && (
                  <span className="absolute -top-1.5 -right-1.5 inline-flex items-center justify-center min-w-[16px] h-[16px] px-1 text-[8px] font-bold text-white bg-danger-500 rounded-full shadow-sm">
                    {chatUnread > 99 ? '99+' : chatUnread}
                  </span>
                )}
              </div>
              {!collapsed && (
                <>
                  <span>{item.label}</span>
                  {showBadge && (
                    <span className="ml-auto inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 text-[9px] font-bold text-white bg-danger-500 rounded-full">
                      {chatUnread > 99 ? '99+' : chatUnread}
                    </span>
                  )}
                </>
              )}
              {isActive && !collapsed && !showBadge && (
                <div className="w-1 h-4 bg-primary-600 rounded-full ml-auto" />
              )}
            </NavLink>
          );
        })}
      </nav>


    </aside>
  );
}
