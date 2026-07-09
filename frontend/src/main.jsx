import { createRoot } from 'react-dom/client'
import { QueryClient } from '@tanstack/react-query'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data is considered fresh for 5 minutes — no re-fetch on route navigation
      staleTime: 5 * 60 * 1000,
      // Keep unused data in cache for 10 minutes (instant back-navigation)
      gcTime: 10 * 60 * 1000,
      // Retry once on failure, not 3 times (faster error recovery)
      retry: 1,
      // Don't re-fetch when user re-focuses the tab (reduces unnecessary calls)
      refetchOnWindowFocus: false,
    },
  },
});
import axios from 'axios';
import apiClient, { CLIENT_ID, CLIENT_SECRET } from './utils/apiClient'

window.apiClient = apiClient;
window.CLIENT_ID = CLIENT_ID;
window.CLIENT_SECRET = CLIENT_SECRET;

const API_URL = import.meta.env.VITE_API_URL || 'https://api.hire1percent.com/api';

// --- Axios Request Interceptor ---
axios.interceptors.request.use(
  (config) => {
    const urlStr = config.url || '';
    const isTargetApi = urlStr.startsWith('http') ? urlStr.includes('/api') : urlStr.startsWith('/api');
    
    if (isTargetApi) {
      config.headers['X-Client-ID'] = CLIENT_ID;
      config.headers['X-Client-Secret'] = CLIENT_SECRET;

      const accessToken = localStorage.getItem('accessToken');
      if (accessToken && !config.headers['Authorization']) {
        config.headers['Authorization'] = `Bearer ${accessToken}`;
      }

      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken && !config.headers['X-Refresh-Token']) {
        config.headers['X-Refresh-Token'] = refreshToken;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// --- Axios Response Interceptor (handles silent refresh & errors) ---
axios.interceptors.response.use(
  (response) => {
    const newAccessToken = response.headers['x-new-access-token'];
    if (newAccessToken) {
      localStorage.setItem('accessToken', newAccessToken);
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      const errCode = error.response.data?.code;
      if (errCode === 'TOKEN_EXPIRED' || errCode === 'INVALID_TOKEN') {
        originalRequest._retry = true;
        try {
          const refreshToken = localStorage.getItem('refreshToken');
          if (!refreshToken) throw new Error('No refresh token available');

          const refreshRes = await axios.post(`${API_URL}/gateway/refresh`, {
            refreshToken
          }, {
            headers: {
              'X-Client-ID': CLIENT_ID,
              'X-Client-Secret': CLIENT_SECRET
            }
          });

          const refreshPayload = refreshRes.data?.data || refreshRes.data;
          if (refreshPayload && refreshPayload.accessToken) {
            const newAccessToken = refreshPayload.accessToken;
            localStorage.setItem('accessToken', newAccessToken);
            originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
            return axios(originalRequest);
          }
        } catch (refreshErr) {
          console.error('[GLOBAL-AXIOS-INTERCEPTOR] Silent refresh failed:', refreshErr.message);
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');
          window.location.href = '/login';
        }
      } else if (errCode === 'SESSION_EXPIRED') {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// --- Monkey-Patch window.fetch ---
const originalFetch = window.fetch;
window.fetch = async function (url, options = {}) {
  let urlStr = '';
  if (typeof url === 'string') {
    urlStr = url;
  } else if (url && typeof url === 'object' && url.url) {
    urlStr = url.url;
  }

  const isTargetApi = urlStr && (urlStr.startsWith('http') ? urlStr.includes('/api') : urlStr.startsWith('/api'));

  if (isTargetApi) {
    options.headers = {
      ...options.headers,
      'X-Client-ID': CLIENT_ID,
      'X-Client-Secret': CLIENT_SECRET
    };

    const accessToken = localStorage.getItem('accessToken');
    if (accessToken && !options.headers['Authorization']) {
      options.headers['Authorization'] = `Bearer ${accessToken}`;
    }

    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken && !options.headers['X-Refresh-Token']) {
      options.headers['X-Refresh-Token'] = refreshToken;
    }
  }

  const response = await originalFetch(url, options);

  if (isTargetApi && response.headers) {
    const newAccessToken = response.headers.get('X-New-Access-Token');
    if (newAccessToken) {
      localStorage.setItem('accessToken', newAccessToken);
    }
  }

  return response;
};

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </HelmetProvider>
  </StrictMode>,
)
