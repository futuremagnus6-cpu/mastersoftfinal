import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  FiGrid, FiShoppingCart, FiBox, FiUsers, FiPackage,
  FiTruck, FiShoppingBag, FiDollarSign, FiBarChart2,
  FiSettings, FiUserCheck, FiGift, FiAlertCircle,
  FiLogOut, FiChevronDown, FiChevronLeft, FiShield,
  FiTrendingUp, FiHeadphones, FiLayers, FiClock, FiGlobe, FiTrash2,
} from 'react-icons/fi';
import { getEnabledMenuItems } from '../../utils/features';

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
];

const superAdminMenuItems = [
  { path: '/super-admin', icon: FiGrid, label: 'Dashboard', roles: ['super_admin'] },
  { path: '/super-admin/shops', icon: FiShoppingBag, label: 'Shops', roles: ['super_admin'] },
  { path: '/super-admin/pre-shops', icon: FiClock, label: 'Pre-Shops', roles: ['super_admin'] },
  { path: '/super-admin/recycle-bin', icon: FiTrash2, label: 'Recycle Bin', roles: ['super_admin'] },
  { path: '/super-admin/plans', icon: FiTrendingUp, label: 'Plans', roles: ['super_admin'] },
  { path: '/super-admin/analytics', icon: FiBarChart2, label: 'Analytics', roles: ['super_admin'] },
  { path: '/super-admin/settings', icon: FiSettings, label: 'Settings', roles: ['super_admin'] },
];

export default function Sidebar({ collapsed, onToggle }) {
  const { user, shopFeatures } = useSelector((state) => state.auth);
  const location = useLocation();
  const isSuperAdmin = user?.role === 'super_admin';
  const menuItems = isSuperAdmin ? superAdminMenuItems : shopMenuItems;

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
      {/* Logo */}
      <div className={`flex items-center h-16 border-b dark:border-gray-700 px-4 ${collapsed ? 'justify-center' : 'justify-between'}`}>
        {!collapsed && (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <FiShield className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900 dark:text-white">Magnus</p>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 -mt-0.5">Business OS</p>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
            <FiShield className="w-4 h-4 text-white" />
          </div>
        )}
        <button
          onClick={onToggle}
          className={`p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 ${collapsed ? 'hidden' : ''}`}
        >
          <FiChevronLeft className="w-4 h-4" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
        {filteredItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path ||
            (item.path !== '/' && location.pathname.startsWith(item.path));

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-400'
                  : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700/50'
              } ${collapsed ? 'justify-center px-2' : ''}`}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span>{item.label}</span>}
              {isActive && !collapsed && (
                <div className="w-1 h-4 bg-primary-600 rounded-full ml-auto" />
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className="border-t dark:border-gray-700 p-2">
        {/* Collapse toggle */}
        <button
          onClick={onToggle}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all ${
            collapsed ? 'justify-center' : ''
          }`}
        >
          <FiChevronLeft className={`w-4 h-4 transition-transform ${collapsed ? 'rotate-180' : ''}`} />
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </aside>
  );
}
