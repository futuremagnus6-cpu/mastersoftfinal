// ════════════════════════════════════════════════════════════════
// Frontend Runtime Configuration
// ════════════════════════════════════════════════════════════════
// In production (Vite build), VITE_API_URL should be the same origin
// since Nginx/Managed hosting proxies /api to the backend.
// Only set VITE_API_URL if the backend is on a different domain.
// ════════════════════════════════════════════════════════════════

const config = {
  apiUrl: import.meta.env.VITE_API_URL || '',
  socketUrl: import.meta.env.VITE_SOCKET_URL || '',
  env: import.meta.env.MODE,
};

export default config;
