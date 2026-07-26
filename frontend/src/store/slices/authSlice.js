import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';
import toast from 'react-hot-toast';

// ─── Dual Storage Helpers (localStorage for "Remember Me", sessionStorage for session-only) ───

const TOKEN_KEY = 'token';
const REFRESH_KEY = 'refreshToken';

const storage = {
  get(key) {
    return localStorage.getItem(key) || sessionStorage.getItem(key);
  },
  set(key, value, persist) {
    if (persist) {
      localStorage.setItem(key, value);
      sessionStorage.removeItem(key);
    } else {
      sessionStorage.setItem(key, value);
      localStorage.removeItem(key);
    }
  },
  remove(key) {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  },
};

// ─── Async Thunks ───

export const login = createAsyncThunk('auth/login', async (credentials, { rejectWithValue }) => {
  try {
    const { data } = await api.post('/auth/login', credentials);
    const persist = !!credentials.rememberMe;
    // Don't store tokens yet if 2FA is required — the preference will be
    // carried along via persistSession so verify2FA knows which storage to use.
    if (!data.requiresTwoFactor) {
      storage.set(TOKEN_KEY, data.token, persist);
      storage.set(REFRESH_KEY, data.refreshToken, persist);
    }
    return { ...data, persistSession: persist };
  } catch (error) {
    const message = error.response?.data?.message || 'Login failed';
    toast.error(message);
    return rejectWithValue(message);
  }
});

export const verify2FA = createAsyncThunk('auth/verify2FA', async (otpData, { getState, rejectWithValue }) => {
  try {
    const { data } = await api.post('/auth/verify-2fa', otpData);
    // Read the persistSession preference stored by the login thunk,
    // defaulting to true (localStorage) if not set.
    const persist = getState()?.auth?.persistSession ?? true;
    storage.set(TOKEN_KEY, data.token, persist);
    storage.set(REFRESH_KEY, data.refreshToken, persist);
    return data;
  } catch (error) {
    const message = error.response?.data?.message || '2FA verification failed';
    toast.error(message);
    return rejectWithValue(message);
  }
});

export const getMe = createAsyncThunk('auth/getMe', async (_, { rejectWithValue }) => {
  try {
    const { data } = await api.get('/auth/me');
    return data;
  } catch (error) {
    // If backend is unreachable or token is invalid, clear auth state
    storage.remove(TOKEN_KEY);
    storage.remove(REFRESH_KEY);
    return rejectWithValue(error.response?.data?.message || 'Failed to fetch user');
  }
});

export const logout = createAsyncThunk('auth/logout', async () => {
  try { await api.post('/auth/logout'); } catch (e) { /* ignore */ }
  storage.remove(TOKEN_KEY);
  storage.remove(REFRESH_KEY);
  window.location.href = '/login';
});

const initialState = {
  user: null,
  token: storage.get(TOKEN_KEY),
  refreshToken: storage.get(REFRESH_KEY),
  isAuthenticated: false,
  requiresTwoFactor: false,
  tempToken: null,
  loading: !!storage.get(TOKEN_KEY), // Start loading if we have a token to verify
  error: null,
  shopFeatures: null, // { features: {...}, subscriptionStatus: 'active'|'trial'|'expired' }
  persistSession: null, // rememberMe flag carried through the 2FA flow
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (state, action) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.refreshToken = action.payload.refreshToken;
      state.isAuthenticated = true;
    },
    setShopFeatures: (state, action) => {
      state.shopFeatures = {
        features: action.payload,
        subscriptionStatus: state.shopFeatures?.subscriptionStatus || 'trial',
      };
    },
    clearError: (state) => { state.error = null; },
    setTwoFactor: (state, action) => {
      state.requiresTwoFactor = action.payload.requiresTwoFactor;
      state.tempToken = action.payload.tempToken;
      state.persistSession = action.payload.persistSession;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload.requiresTwoFactor) {
          state.requiresTwoFactor = true;
          state.tempToken = action.payload.tempToken;
          state.persistSession = action.payload.persistSession;
        } else {
          state.user = action.payload.user;
          state.token = action.payload.token;
          state.refreshToken = action.payload.refreshToken;
          state.isAuthenticated = true;
          state.shopFeatures = action.payload.shopFeatures || null;
        }
      })
      .addCase(login.rejected, (state, action) => { state.loading = false; state.error = action.payload; })
      .addCase(verify2FA.fulfilled, (state, action) => {
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.refreshToken = action.payload.refreshToken;
        state.isAuthenticated = true;
        state.requiresTwoFactor = false;
        state.tempToken = null;
        state.persistSession = null;
        state.loading = false;
        state.shopFeatures = action.payload.shopFeatures || null;
      })
      .addCase(verify2FA.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(getMe.fulfilled, (state, action) => {
        state.user = action.payload.user || action.payload.data;
        state.isAuthenticated = true;
        state.loading = false;
        state.shopFeatures = action.payload.shopFeatures || null;
      })
      .addCase(getMe.rejected, (state) => {
        state.user = null;
        state.token = null;
        state.refreshToken = null;
        state.isAuthenticated = false;
        state.loading = false;
        state.persistSession = null;
      })
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.token = null;
        state.refreshToken = null;
        state.isAuthenticated = false;
        state.shopFeatures = null;
        state.persistSession = null;
      });
  },
});

export const { setCredentials, setShopFeatures, clearError, setTwoFactor } = authSlice.actions;
export default authSlice.reducer;
