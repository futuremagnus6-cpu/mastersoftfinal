import React, { useState, useRef, useCallback } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

export default function AppLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  // Refs for swipe gesture tracking
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed(prev => !prev);
  }, []);

  const toggleMobileSidebar = useCallback(() => {
    setMobileSidebarOpen(prev => !prev);
  }, []);

  const closeMobileSidebar = useCallback(() => {
    setMobileSidebarOpen(false);
  }, []);

  const handleTouchStart = useCallback((e) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback((e) => {
    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;
    const deltaX = endX - touchStartX.current;
    const deltaY = endY - touchStartY.current;

    // Only trigger if it's a horizontal swipe (not vertical scrolling)
    if (Math.abs(deltaX) > Math.abs(deltaY) * 1.5 && Math.abs(deltaX) > 50) {
      if (deltaX > 0 && !mobileSidebarOpen) {
        // Swipe right on the page edge → open sidebar
        if (touchStartX.current < 40) {
          setMobileSidebarOpen(true);
        }
      } else if (deltaX < 0 && mobileSidebarOpen) {
        // Swipe left → close sidebar
        setMobileSidebarOpen(false);
      }
    }
  }, [mobileSidebarOpen]);

  return (
    <div
      className="min-h-screen bg-gray-50 dark:bg-gray-900"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Mobile Sidebar Overlay */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden animate-fade-in"
          onClick={closeMobileSidebar}
        />
      )}

      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <Sidebar collapsed={sidebarCollapsed} onToggle={toggleSidebar} />
      </div>

      {/* Mobile Sidebar (overlay) — w-64 ensures translate hides it properly */}
      <div className={`lg:hidden fixed inset-y-0 left-0 z-30 w-64 transition-transform duration-300 ${
        mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <Sidebar collapsed={false} onToggle={toggleMobileSidebar} onNavClick={closeMobileSidebar} />
      </div>

      {/* Main Content Area */}
      <div className={`transition-all duration-300 ${
        sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64'
      }`}>
        <Navbar onMenuToggle={toggleMobileSidebar} />

        <main className="min-h-[calc(100vh-4rem)]">
          <Outlet />
        </main>

        {/* Footer */}
        <footer className="border-t dark:border-gray-700 bg-white dark:bg-gray-800 px-6 py-3">
          <div className="flex items-center justify-between text-xs text-gray-400 dark:text-gray-500">
            <p>&copy; {new Date().getFullYear()} Future Magnus Business OS. All rights reserved.</p>
            <p>v2.0</p>
          </div>
        </footer>
      </div>
    </div>
  );
}
