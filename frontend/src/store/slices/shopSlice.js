import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

export const fetchShopDetails = createAsyncThunk('shop/fetchDetails', async (shopId, { rejectWithValue }) => {
  try {
    const { data } = await api.get(`/shops/${shopId}`);
    return data.data || data;
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || 'Failed to fetch shop details');
  }
});

export const updateShopSettings = createAsyncThunk('shop/updateSettings', async ({ shopId, settings }, { rejectWithValue }) => {
  try {
    const { data } = await api.put(`/shops/${shopId}`, settings);
    return data.data || data;
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || 'Failed to update settings');
  }
});

const initialState = {
  currentShop: null,
  shops: [],
  loading: false,
  error: null,
};

const shopSlice = createSlice({
  name: 'shop',
  initialState,
  reducers: {
    setCurrentShop: (state, action) => { state.currentShop = action.payload; },
    clearShops: (state) => { state.shops = []; state.currentShop = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchShopDetails.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchShopDetails.fulfilled, (state, action) => { state.loading = false; state.currentShop = action.payload; })
      .addCase(fetchShopDetails.rejected, (state, action) => { state.loading = false; state.error = action.payload; });
  },
});

export const { setCurrentShop, clearShops } = shopSlice.actions;
export default shopSlice.reducer;
