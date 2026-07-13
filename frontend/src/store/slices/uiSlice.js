import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  sidebarOpen: true,
  theme: 'light',
  language: 'en',
  modalOpen: null,
  modalData: null,
  globalLoading: false,
  notifications: [],
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleSidebar: (state) => { state.sidebarOpen = !state.sidebarOpen; },
    setSidebarOpen: (state, action) => { state.sidebarOpen = action.payload; },
    setTheme: (state, action) => {
      state.theme = action.payload;
      if (action.payload === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    },
    setLanguage: (state, action) => { state.language = action.payload; },
    openModal: (state, action) => { state.modalOpen = action.payload.type; state.modalData = action.payload.data || null; },
    closeModal: (state) => { state.modalOpen = null; state.modalData = null; },
    setGlobalLoading: (state, action) => { state.globalLoading = action.payload; },
    addNotification: (state, action) => { state.notifications.push(action.payload); },
    clearNotifications: (state) => { state.notifications = []; },
  },
});

export const {
  toggleSidebar, setSidebarOpen, setTheme, setLanguage,
  openModal, closeModal, setGlobalLoading, addNotification, clearNotifications,
} = uiSlice.actions;

export default uiSlice.reducer;
