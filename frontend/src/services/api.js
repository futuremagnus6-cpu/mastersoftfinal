import axios from 'axios';
import config from '../config';

let storeInstance;
const apiBaseUrl = config.apiUrl || '/api';

const joinApiUrl = (baseUrl, path) => (
  `${baseUrl.replace(/\/$/, '')}/${path.replace(/^\//, '')}`
);

/**
 * Inject store after creation to avoid circular dependency.
 * Call this in main.jsx after creating the store.
 */
export const injectStore = (store) => {
  storeInstance = store;
};

const api = axios.create({
  baseURL: apiBaseUrl,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

// Request interceptor - add auth token and shop context
api.interceptors.request.use(
  (config) => {
    if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
      if (typeof config.headers?.delete === 'function') {
        config.headers.delete('Content-Type');
      } else if (config.headers) {
        delete config.headers['Content-Type'];
        delete config.headers['content-type'];
      }
    }

    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Add multi-tenant headers if available
    if (storeInstance) {
      const state = storeInstance.getState();
      if (state.auth?.user?.shopId) {
        config.headers['x-shop-id'] = state.auth.user.shopId?._id || state.auth.user.shopId;
      }
      if (state.auth?.user?.branchId) {
        config.headers['x-branch-id'] = state.auth.user.branchId?._id || state.auth.user.branchId;
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle token refresh and errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 - Token expired
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          const { data } = await axios.post(joinApiUrl(apiBaseUrl, '/auth/refresh-token'), { refreshToken });
          localStorage.setItem('token', data.token);
          localStorage.setItem('refreshToken', data.refreshToken);
          originalRequest.headers.Authorization = `Bearer ${data.token}`;
          return api(originalRequest);
        } catch (refreshError) {
          // Refresh failed - logout
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
          window.location.href = '/login';
          return Promise.reject(refreshError);
        }
      } else {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
      }
    }

    // Handle 403 - Permission denied
    if (error.response?.status === 403) {
      console.error('Access denied:', error.response?.data?.message);
    }

    // Handle 423 - Account locked
    if (error.response?.status === 423) {
      console.error('Account locked:', error.response?.data?.message);
    }

    return Promise.reject(error);
  }
);

// API Service Methods
const apiService = {
  // Auth
  login: (credentials) => api.post('/auth/login', credentials),
  verify2FA: (data) => api.post('/auth/verify-2fa', data),
  getMe: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (data) => api.post('/auth/reset-password', data),
  updateProfile: (data) => api.put('/auth/profile', data),
  changePassword: (data) => api.put('/auth/change-password', data),

  // Shops (Super Admin)
  getShops: (params) => api.get('/shops', { params }),
  getShop: (id) => api.get(`/shops/${id}`),
  createShop: (data) => api.post('/shops', data),
  updateShop: (id, data) => api.put(`/shops/${id}`, data),
  activateShop: (id) => api.put(`/shops/${id}/activate`),
  suspendShop: (id) => api.put(`/shops/${id}/suspend`),
  deleteShop: (id) => api.delete(`/shops/${id}`),
  getShopStats: (id) => api.get(`/shops/${id}/stats`),
  getShopAdmin: (id) => api.get(`/shops/${id}/admin`),
  sendAdminPasswordResetLink: (id) => api.post(`/shops/${id}/send-reset-link`),

  // Trial & Subscription Management (Super Admin)
  closeTrial: (id) => api.put(`/shops/${id}/close-trial`),
  extendTrial: (id, days) => api.put(`/shops/${id}/extend-trial`, { days }),
  sendSubscriptionReminder: (id) => api.post(`/shops/${id}/send-subscription-reminder`),

  // Recycle Bin (Super Admin)
  getRecycleBin: (params) => api.get('/shops/recycle-bin/list', { params }),
  restoreShop: (id) => api.put(`/shops/${id}/restore`),
  permanentDeleteShop: (id) => api.delete(`/shops/${id}/permanent-delete`),

  // Payments / Billing
  createPaymentOrder: (data) => api.post('/payments/create-order', data),
  verifyPayment: (data) => api.post('/payments/verify', data),
  extendPayment: (data) => api.post('/payments/extend', data),
  getSubscriptionBilling: () => api.get('/payments/subscription'),
  cancelSubscription: (data) => api.post('/payments/cancel', data),
  getAdminBilling: (params) => api.get('/payments/admin', { params }),
  getBillingInvoice: (id) => api.get(`/payments/transactions/${id}/invoice`),

  // Dashboard
  getShopDashboard: () => api.get('/dashboard/shop'),
  getSuperAdminDashboard: () => api.get('/dashboard/super-admin'),

  // Products
  getProducts: (params) => api.get('/products', { params }),
  getProduct: (id) => api.get(`/products/${id}`),
  createProduct: (data) => api.post('/products', data),
  updateProduct: (id, data) => api.put(`/products/${id}`, data),
  deleteProduct: (id) => api.delete(`/products/${id}`),
  searchProducts: (q) => api.get('/products/search', { params: { q } }),
  getByBarcode: (barcode) => api.get(`/products/barcode/${barcode}`),
  getCategories: () => api.get('/products/categories/list'),
  updateStock: (id, data) => api.put(`/products/${id}/stock`, data),
  importProducts: (formData) => api.post('/products/import', formData),
  importProductsFromUrl: (data) => api.post('/products/import', data),
  bulkDeleteProducts: (ids) => api.post('/products/bulk-delete', { ids }),
  deleteAllProducts: () => api.delete('/products/all'),

  // Orders
  getOrders: (params) => api.get('/orders', { params }),
  getOrder: (id) => api.get(`/orders/${id}`),
  createOrder: (data) => api.post('/orders', data),
  updateOrder: (id, data) => api.put(`/orders/${id}`, data),
  cancelOrder: (id) => api.put(`/orders/${id}/cancel`),
  getTodaySummary: () => api.get('/orders/today/summary'),
  syncOfflineOrders: (orders) => api.post('/orders/sync-offline', { orders }),

  // Customers
  getCustomers: (params) => api.get('/customers', { params }),
  getCustomer: (id) => api.get(`/customers/${id}`),
  createCustomer: (data) => api.post('/customers', data),
  updateCustomer: (id, data) => api.put(`/customers/${id}`, data),
  deleteCustomer: (id) => api.delete(`/customers/${id}`),
  searchCustomers: (q) => api.get('/customers/search', { params: { q } }),

  // Inventory
  getInventoryLogs: (params) => api.get('/inventory/logs', { params }),
  getStockSummary: () => api.get('/inventory/summary'),
  getExpiringProducts: (days) => api.get('/inventory/expiring', { params: { days } }),

  // Suppliers
  getSuppliers: (params) => api.get('/suppliers', { params }),
  getSupplier: (id) => api.get(`/suppliers/${id}`),
  createSupplier: (data) => api.post('/suppliers', data),
  updateSupplier: (id, data) => api.put(`/suppliers/${id}`, data),
  deleteSupplier: (id) => api.delete(`/suppliers/${id}`),

  // Purchases
  getPurchases: (params) => api.get('/purchases', { params }),
  getPurchase: (id) => api.get(`/purchases/${id}`),
  createPurchase: (data) => api.post('/purchases', data),
  receivePurchase: (id) => api.put(`/purchases/${id}/receive`),

  // Expenses
  getExpenses: (params) => api.get('/expenses', { params }),
  createExpense: (data) => api.post('/expenses', data),
  updateExpense: (id, data) => api.put(`/expenses/${id}`, data),
  deleteExpense: (id) => api.delete(`/expenses/${id}`),
  approveExpense: (id) => api.put(`/expenses/${id}/approve`),

  // Employees
  getEmployees: (params) => api.get('/employees', { params }),
  createEmployee: (data) => api.post('/employees', data),
  updateEmployee: (id, data) => api.put(`/employees/${id}`, data),
  deleteEmployee: (id) => api.delete(`/employees/${id}`),

  // Users / Team Members
  getUsers: (params) => api.get('/users', { params }),
  getUser: (id) => api.get(`/users/${id}`),
  createUser: (data) => api.post('/users', data),
  updateUser: (id, data) => api.put(`/users/${id}`, data),
  deleteUser: (id) => api.delete(`/users/${id}`),
  updateUserPermissions: (id, permissions) => api.put(`/users/${id}/permissions`, { permissions }),

  // Subscriptions
  getPlans: () => api.get('/subscriptions/plans'),
  createPlan: (data) => api.post('/subscriptions/plans', data),
  updatePlan: (id, data) => api.put(`/subscriptions/plans/${id}`, data),
  assignPlan: (data) => api.post('/subscriptions/assign', data),
  deletePlan: (id) => api.delete("/subscriptions/plans/" + id),
  getMySubscription: () => api.get('/subscriptions/my-subscription'),

  // Reports
  getSalesReport: (params) => api.get('/reports/sales', { params }),
  getInventoryReport: () => api.get('/reports/inventory'),
  getGstReport: (params) => api.get('/reports/gst', { params }),
  getProfitLoss: (params) => api.get('/reports/profit-loss', { params }),
  getCustomerReport: () => api.get('/reports/customers'),

  // Notifications
  getNotifications: (params) => api.get('/notifications', { params }),
  markAsRead: (id) => api.put(`/notifications/${id}/read`),
  markAllAsRead: () => api.put('/notifications/read-all'),

  // Settings & Config
  getShopSettings: () => api.get('/settings'),
  updateShopSettings: (data) => api.put('/settings', data),
  getAlerts: () => api.get('/alerts'),
  getAlertConfig: () => api.get('/alerts'),
  updateAlertConfig: (type, data) => api.put(`/alerts/${type}`, data),
  toggleAlert: (type) => api.patch(`/alerts/${type}/toggle`),

  // Contact / Enquiry
  submitEnquiry: (data) => api.post('/contact', data),
  getEnquiries: (params) => api.get('/contact', { params }),
  getEnquiry: (id) => api.get(`/contact/${id}`),
  updateEnquiry: (id, data) => api.put(`/contact/${id}`, data),
  getEnquiryStats: () => api.get('/contact/stats'),

  // Loyalty
  getLoyaltyTiers: () => api.get('/loyalty/tiers'),
  createLoyaltyTier: (data) => api.post('/loyalty/tiers', data),
  updateLoyaltyTier: (id, data) => api.put(`/loyalty/tiers/${id}`, data),
  deleteLoyaltyTier: (id) => api.delete(`/loyalty/tiers/${id}`),
  getLoyaltyTransactions: (params) => api.get('/loyalty/transactions', { params }),
  createLoyaltyTransaction: (data) => api.post('/loyalty/transactions', data),
  getCustomerLoyaltyBalance: (customerId) => api.get(`/loyalty/balance/${customerId}`),
  getCustomerLoyaltyStats: (customerId) => api.get(`/loyalty/customer-stats/${customerId}`),
  earnLoyaltyFromOrder: (data) => api.post('/loyalty/earn-from-order', data),
  getLoyaltySettings: () => api.get('/loyalty/settings'),
  updateLoyaltySettings: (data) => api.put('/loyalty/settings', data),

  // Support Tickets
  getTickets: (params) => api.get('/support', { params }),
  createSupportTicket: (data) => api.post('/support', data),
  updateTicket: (id, data) => api.put(`/support/${id}`, data),

  // CRM
  getCustomerActivity: (customerId) => api.get(`/crm/${customerId}/activity`),
  getCustomerSegments: () => api.get('/crm/segments'),
  addCustomerNote: (customerId, data) => api.post(`/crm/${customerId}/notes`, data),

  // File Upload
  uploadFile: (formData) => api.post('/upload', formData),

  // Announcement (Super Admin)
  sendAnnouncement: (data) => api.post('/shops/send-announcement', data),

  // Platform Config (Super Admin)
  getPlatformConfig: () => api.get('/platform-config'),
  updatePlatformConfig: (data) => api.put('/platform-config', data),

  // Invoice
  generateOrderInvoice: (orderId) => api.post(`/orders/${orderId}/generate-invoice`),
};

export default api;
export { apiService };
