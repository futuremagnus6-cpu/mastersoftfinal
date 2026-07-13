import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App';
import { store } from './store';
import { injectStore } from './services/api';
import './styles/index.css';

// Inject store into API service (avoids circular dependency)
injectStore(store);

// Initialize i18n (future multi-language support)
import './i18n';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <App />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: { background: '#1e293b', color: '#f8fafc', borderRadius: '8px' },
            success: { iconTheme: { primary: '#22c55e', secondary: '#f0fdf4' } },
            error: { iconTheme: { primary: '#ef4444', secondary: '#fef2f2' } },
          }}
        />
      </BrowserRouter>
    </Provider>
  </React.StrictMode>
);
