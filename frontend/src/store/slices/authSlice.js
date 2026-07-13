import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';
import toast from 'react-hot-toast';

// Async Thunks
export const login = createAsyncThunk('auth/login', async (credentials, { rejectWithValue }) => {
  try {
    const { data } = await api.post('/auth/login', credentials);
    localStorage.setItem('token', data.token);
    localStorage.setItem('refreshToken', data.refreshToken);
    return data;
  } catch (error) {
    const message = error.response?.data?.message || 'Login failed';
    toast.error(message);
    return rejectWithValue(message);
  }
});

export const verify2FA = createAsyncThunk('auth/verify2FA', async (otpData, { rejectWithValue }) => {
  try {
    const { data } = await api.post('/auth/verify-2fa', otpData);
    localStorage.setItem('token', data.token);
    localStorage.setItem('refreshToken', data.refreshToken);
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
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    return rejectWithValue(error.response?.data?.message || 'Failed to fetch user');
  }
});

export const logout = createAsyncThunk('auth/logout', async () => {
  try { await api.post('/auth/logout'); } catch (e) { /* ignore */ }
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
  window.location.href = '/login';
});

const initialState = {
  user: null,
  token: localStorage.getItem('token'),
  refreshToken: localStorage.getItem('refreshToken'),
  isAuthenticated: false,
  requiresTwoFactor: false,
  tempToken: null,
  loading: !!localStorage.getItem('token'), // Start loading if we have a token to verify
  error: null,
  shopFeatures: null, // { features: {...}, subscriptionStatus: 'active'|'trial'|'expired' }
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
    clearError: (state) => { state.error = null; },
    setTwoFactor: (state, action) => {
      state.requiresTwoFactor = action.payload.requiresTwoFactor;
      state.tempToken = action.payload.tempToken;
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
      })
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.token = null;
        state.refreshToken = null;
        state.isAuthenticated = false;
        state.shopFeatures = null;
      });
  },
});

export const { setCredentials, clearError, setTwoFactor } = authSlice.actions;
export default authSlice.reducer;
