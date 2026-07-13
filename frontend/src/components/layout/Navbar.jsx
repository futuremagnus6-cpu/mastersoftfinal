import React, { useState, useRef, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { logout } from '../../store/slices/authSlice';
import { setTheme } from '../../store/slices/uiSlice';
import {
  FiSearch, FiBell, FiSun, FiMoon, FiUser, FiLogOut,
  FiSettings, FiChevronDown, FiMenu,
} from 'react-icons/fi';

export default function Navbar({ onMenuToggle }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const { theme } = useSelector((state) => state.ui);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const profileRef = useRef(null);
  const notifRef = useRef(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotificationsOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleLogout = () => dispatch(logout());

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    dispatch(setTheme(newTheme));
    localStorage.setItem('theme', newTheme);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
      setSearchOpen(false);
    }
  };

  const getInitials = (name) => {
    return name?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) || 'U';
  };

  const getRoleBadge = (role) => {
    const badges = {
      super_admin: 'badge-danger',
      shop_admin: 'badge-warning',
      manager: 'badge-info',
      staff: 'badge-success',
    };
    return badges[role] || 'badge-info';
  };

  return (
    <header className="h-16 bg-white dark:bg-gray-800 border-b dark:border-gray-700 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-20">
      {/* Left: Menu button + Search */}
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuToggle}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 lg:hidden"
        >
          <FiMenu className="w-5 h-5" />
        </button>

        {/* Desktop Search */}
        <form onSubmit={handleSearch} className="hidden md:flex items-center">
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products, orders, customers..."
              className="w-72 lg:w-96 pl-9 pr-4 py-2 bg-gray-100 dark:bg-gray-700 border-0 rounded-lg text-sm
                focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-gray-200
                placeholder:text-gray-400 dark:placeholder:text-gray-500"
            />
          </div>
        </form>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {/* Mobile Search */}
        <button
          onClick={() => setSearchOpen(!searchOpen)}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 md:hidden"
        >
          <FiSearch className="w-5 h-5" />
        </button>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark' ? <FiSun className="w-5 h-5" /> : <FiMoon className="w-5 h-5" />}
        </button>

        {/* Notifications */}
        <div ref={notifRef} className="relative">
          <button
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 relative"
          >
            <FiBell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-danger-500 rounded-full"></span>
          </button>

          {notificationsOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-lg border dark:border-gray-700 animate-slide-down overflow-hidden">
              <div className="p-3 border-b dark:border-gray-700 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Notifications</h3>
                <button className="text-xs text-primary-600 hover:text-primary-700">Mark all read</button>
              </div>
              <div className="max-h-64 overflow-y-auto p-2">
                <div className="text-center py-8 text-sm text-gray-500 dark:text-gray-400">
                  <FiBell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  No new notifications
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Profile Dropdown */}
        <div ref={profileRef} className="relative">
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
              {getInitials(user?.name)}
            </div>
            <div className="hidden md:block text-left">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-200 leading-tight">{user?.name}</p>
              <p className={`text-[10px] leading-tight mt-0.5 ${getRoleBadge(user?.role)}`}>
                {user?.role?.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
              </p>
            </div>
            <FiChevronDown className="w-4 h-4 text-gray-400" />
          </button>

          {profileOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-lg border dark:border-gray-700 animate-slide-down overflow-hidden">
              {/* User Info */}
              <div className="p-4 border-b dark:border-gray-700">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{user?.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{user?.email}</p>
                <p className={`text-xs mt-1.5 inline-block ${getRoleBadge(user?.role)}`}>
                  {user?.role?.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                </p>
              </div>

              {/* Menu Items */}
              <div className="p-1">
                <button
                  onClick={() => { setProfileOpen(false); navigate('/settings'); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <FiUser className="w-4 h-4" /> Profile Settings
                </button>
                <button
                  onClick={() => { setProfileOpen(false); navigate('/settings'); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <FiSettings className="w-4 h-4" /> Account Settings
                </button>
                <hr className="my-1 dark:border-gray-700" />
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-danger-600 dark:text-danger-400 rounded-lg hover:bg-danger-50 dark:hover:bg-danger-900/20"
                >
                  <FiLogOut className="w-4 h-4" /> Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Search Bar */}
      {searchOpen && (
        <div className="absolute top-16 left-0 right-0 bg-white dark:bg-gray-800 border-b dark:border-gray-700 p-3 animate-slide-down md:hidden">
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="input-field flex-1"
              autoFocus
            />
            <button type="submit" className="btn-primary px-4">
              <FiSearch className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </header>
  );
}
