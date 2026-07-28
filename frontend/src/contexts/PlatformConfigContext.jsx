import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiService } from '../services/api';

const DEFAULT_PLATFORM_NAME = 'Future Magnus Business OS';

const PlatformConfigContext = createContext({
  platformName: DEFAULT_PLATFORM_NAME,
  config: {},
  loading: true,
  refresh: () => {},
});

export function PlatformConfigProvider({ children }) {
  const [config, setConfig] = useState({});
  const [loading, setLoading] = useState(true);

  const loadConfig = useCallback(async () => {
    setLoading(true);

    // Step 1 — Always try the public endpoint first (no auth needed).
    // This works on the landing page, login page, and anywhere else
    // regardless of authentication status.
    try {
      const publicRes = await apiService.getPublicPlatformConfig();
      const publicData = publicRes?.data?.data;
      if (publicData && Object.keys(publicData).length > 0) {
        setConfig((prev) => ({ ...prev, ...publicData }));
      }
    } catch {
      // Public endpoint may not exist yet on older backends — ignore.
    }

    // Step 2 — If the user is authenticated, also fetch the full config
    // (which includes fields only super_admins can see).
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (token) {
      try {
        const res = await apiService.getPlatformConfig();
        const data = res.data?.data || {};
        if (data && Object.keys(data).length > 0) {
          setConfig((prev) => ({ ...prev, ...data }));
        }
      } catch (err) {
        // Silent — 403 is expected for non-super-admin users
        if (err.response?.status !== 403) {
          console.warn('Failed to load full platform config:', err);
        }
      }
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const platformName = config.companyBrandName || config.platformName || DEFAULT_PLATFORM_NAME;

  return (
    <PlatformConfigContext.Provider value={{ platformName, config, loading, refresh: loadConfig }}>
      {children}
    </PlatformConfigContext.Provider>
  );
}

export function usePlatformConfig() {
  const ctx = useContext(PlatformConfigContext);
  if (!ctx) {
    return { platformName: DEFAULT_PLATFORM_NAME, config: {}, loading: false, refresh: () => {} };
  }
  return ctx;
}

export default PlatformConfigContext;
