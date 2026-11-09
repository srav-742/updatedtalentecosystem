import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HelmetProvider } from 'react-helmet-async'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import axios from 'axios'
import './index.css'
import App from './App.jsx'
import { initRoutePrefetcher } from './utils/routePrefetcher'
import apiClient, { API_URL, pingBackendWarmup } from './utils/apiClient'
import { getGatewayHeaders } from './config'

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
      // Offline-first strategy: return cached query immediately without waiting for network handshake
      networkMode: 'offlineFirst',
    },
  },
});

window.apiClient = apiClient;

// --- Axios Request Interceptor ---
axios.interceptors.request.use(
  (config) => {
    const urlStr = config.url || '';
    const isTargetApi = urlStr.startsWith('http') ? urlStr.includes('/api') : urlStr.startsWith('/api');
    
    if (isTargetApi) {
      Object.assign(config.headers, getGatewayHeaders());

      const isGatewayRequest = urlStr.includes(':9090') || urlStr.includes('/backend_service');
      const tokenToSend = isGatewayRequest 
        ? (localStorage.getItem('gatewayAccessToken') || localStorage.getItem('accessToken'))
        : localStorage.getItem('accessToken');

      if (tokenToSend && !config.headers['Authorization']) {
        config.headers['Authorization'] = `Bearer ${tokenToSend}`;
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
    const requestUrl = originalRequest?.url || '';
    // Never clear the user session for 401s from the Java API Gateway (port 9090).
    // Those are gateway-level rejections (invalid/missing token for that service).
    // Only handle session clearing for Node backend (port 5000) 401s.
    const isGatewayRequest = requestUrl.includes(':9090');
    const resData = error.response?.data;
    const status = error.response?.status;

    // Check if pilot account expired or was deleted by admin
    const isPilotExpiredOrRevoked = 
      resData?.pilotExpired || 
      resData?.code === 'PILOT_EXPIRED' || 
      resData?.accountDeleted || 
      (status === 403 && (resData?.code === 'PILOT_EXPIRED' || resData?.pilotExpired)) ||
      (status === 401 && (resData?.accountDeleted || resData?.sessionExpired));

    if (isPilotExpiredOrRevoked) {
      console.warn('[GLOBAL-AXIOS-INTERCEPTOR] Pilot account expired or credentials deleted. Immediate logout.');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      sessionStorage.setItem('login_notice_msg', 'Your session has expired.');
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login?expired=true';
      }
      return Promise.reject(error);
    }

    if (error.response && status === 401 && originalRequest && !originalRequest._retry && !isGatewayRequest) {
      const errCode = error.response.data?.code;
      if (errCode === 'TOKEN_EXPIRED' || errCode === 'INVALID_TOKEN') {
        originalRequest._retry = true;
        try {
          const refreshToken = localStorage.getItem('refreshToken');
          if (!refreshToken) throw new Error('No refresh token available');

          const refreshRes = await axios.post(`${API_URL}/gateway/refresh`, {
            refreshToken
          }, {
            headers: getGatewayHeaders()
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
          // Protect candidates in active assessments from being booted to login
          if (window.location.pathname.includes('/candidate/apply')) {
            localStorage.removeItem('accessToken');
            console.warn('[GLOBAL-AXIOS-INTERCEPTOR] Suppressed redirect — candidate is in active assessment.');
          } else {
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('user');
            sessionStorage.setItem('login_notice_msg', 'Your session has expired.');
            window.location.href = '/login?expired=true';
          }
        }
      } else if (errCode === 'SESSION_EXPIRED') {
        // Protect candidates in active assessments from being booted to login
        if (window.location.pathname.includes('/candidate/apply')) {
          localStorage.removeItem('accessToken');
          console.warn('[GLOBAL-AXIOS-INTERCEPTOR] Suppressed SESSION_EXPIRED redirect — candidate is in active assessment.');
        } else {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');
          sessionStorage.setItem('login_notice_msg', 'Your session has expired.');
          window.location.href = '/login?expired=true';
        }
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
      ...getGatewayHeaders()
    };

    const isGatewayRequest = urlStr.includes(':9090') || urlStr.includes('/backend_service');
    const tokenToSend = isGatewayRequest 
      ? (localStorage.getItem('gatewayAccessToken') || localStorage.getItem('accessToken'))
      : localStorage.getItem('accessToken');

    if (tokenToSend && !options.headers['Authorization']) {
      options.headers['Authorization'] = `Bearer ${tokenToSend}`;
    }

    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken && !options.headers['X-Refresh-Token']) {
      options.headers['X-Refresh-Token'] = refreshToken;
    }
  }

  const response = await originalFetch(url, options);

  if (isTargetApi && response) {
    if (response.headers) {
      const newAccessToken = response.headers.get('X-New-Access-Token');
      if (newAccessToken) {
        localStorage.setItem('accessToken', newAccessToken);
      }
    }

    if (response.status === 401 || response.status === 403) {
      try {
        const cloned = response.clone();
        const data = await cloned.json();
        if (data?.pilotExpired || data?.code === 'PILOT_EXPIRED' || data?.accountDeleted || data?.sessionExpired) {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');
          sessionStorage.setItem('login_notice_msg', 'Your session has expired.');
          if (!window.location.pathname.startsWith('/login')) {
            window.location.href = '/login?expired=true';
          }
        }
      } catch (parseError) {
        console.warn('[GLOBAL-FETCH-INTERCEPTOR] Unable to inspect auth response:', parseError.message);
      }
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
// Activate viewport-based route prefetching (preloads chunks when links are visible)
initRoutePrefetcher();

// Non-blocking asynchronous backend warmup ping — scheduled during idle time after page render
if (typeof window !== 'undefined') {
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(() => pingBackendWarmup(), { timeout: 3000 });
  } else {
    setTimeout(pingBackendWarmup, 2000);
  }
}
