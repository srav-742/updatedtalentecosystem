/**
 * API Client — Centralized HTTP wrapper for the API Gateway
 * 
 * Every outgoing request automatically includes:
 *   - X-Client-ID and X-Client-Secret headers (application authentication)
 *   - Authorization: Bearer <accessToken> header (user authentication)
 *   - X-Refresh-Token header (for silent token renewal)
 * 
 * If a request fails with 401 (token expired), the client will:
 *   1. Attempt to refresh the access token using the refresh token
 *   2. Retry the original request with the new access token
 *   3. If refresh also fails, redirect the user to /login
 */

import { API_URL } from '../config';

const CLIENT_ID = import.meta.env.VITE_CLIENT_ID || 'hire1percent_web_client';
const CLIENT_SECRET = import.meta.env.VITE_CLIENT_SECRET || 'h1p_secret_2026_gateway_key';

/**
 * Get stored tokens from localStorage
 */
export const getTokens = () => {
    try {
        const accessToken = localStorage.getItem('accessToken');
        const refreshToken = localStorage.getItem('refreshToken');
        return { accessToken, refreshToken };
    } catch {
        return { accessToken: null, refreshToken: null };
    }
};

/**
 * Store tokens in localStorage
 */
export const setTokens = (accessToken, refreshToken) => {
    if (accessToken) localStorage.setItem('accessToken', accessToken);
    if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
};

/**
 * Clear all auth data and redirect to login
 */
export const clearAuthAndRedirect = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    window.location.href = '/login';
};

/**
 * Refresh the access token using the refresh token
 */
export const refreshAccessToken = async () => {
    const { refreshToken } = getTokens();
    if (!refreshToken) {
        throw new Error('No refresh token available');
    }

    const response = await fetch(`${API_URL}/gateway/refresh`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Client-ID': CLIENT_ID,
            'X-Client-Secret': CLIENT_SECRET
        },
        body: JSON.stringify({ refreshToken })
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const error = new Error(errorData.message || 'Token refresh failed');
        error.code = errorData.code;
        throw error;
    }

    const data = await response.json();
    const payload = data.data || data;
    setTokens(payload.accessToken, null); // Only update access token
    return payload.accessToken;
};

/**
 * Make an authenticated API request through the gateway
 * 
 * @param {string} endpoint - API endpoint (e.g., '/jobs', '/profile/123')
 * @param {object} options - Fetch options (method, body, etc.)
 * @param {boolean} retry - Internal flag to prevent infinite retry loops
 * @returns {Promise<Response>}
 */
export const apiRequest = async (endpoint, options = {}, retry = true) => {
    const { accessToken, refreshToken } = getTokens();

    const url = endpoint.startsWith('http') ? endpoint : `${API_URL}${endpoint}`;

    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
        'X-Client-ID': CLIENT_ID,
        'X-Client-Secret': CLIENT_SECRET
    };

    // Add auth tokens if available
    if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
    }
    if (refreshToken) {
        headers['X-Refresh-Token'] = refreshToken;
    }

    const timeoutMs = options.timeout || 12000;
    let controller = null;
    let timeoutId = null;

    if (!options.signal) {
        controller = new AbortController();
        timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    }

    let response;
    try {
        response = await fetch(url, {
            ...options,
            signal: options.signal || (controller ? controller.signal : undefined),
            headers
        });
    } finally {
        if (timeoutId) clearTimeout(timeoutId);
    }

    // Check if the gateway returned a new access token (silent refresh happened server-side)
    const newToken = response.headers.get('X-New-Access-Token');
    if (newToken) {
        setTokens(newToken, null);
    }

    // If 401 and we haven't retried yet, attempt token refresh
    if (response.status === 401 && retry) {
        try {
            const responseData = await response.clone().json().catch(() => ({}));

            if (responseData.code === 'TOKEN_EXPIRED' || responseData.code === 'INVALID_TOKEN') {
                const newAccessToken = await refreshAccessToken();
                // Retry the original request with the new token
                return apiRequest(endpoint, options, false);
            }

            if (responseData.code === 'SESSION_EXPIRED') {
                clearAuthAndRedirect();
                return response;
            }
        } catch (refreshError) {
            console.error('[API-CLIENT] Token refresh failed:', refreshError.message);
            clearAuthAndRedirect();
            return response;
        }
    }

    return response;
};

/**
 * Convenience methods
 */
const apiClient = {
    get: (endpoint, options = {}) =>
        apiRequest(endpoint, { ...options, method: 'GET' }),

    post: (endpoint, body, options = {}) =>
        apiRequest(endpoint, {
            ...options,
            method: 'POST',
            body: JSON.stringify(body)
        }),

    put: (endpoint, body, options = {}) =>
        apiRequest(endpoint, {
            ...options,
            method: 'PUT',
            body: JSON.stringify(body)
        }),

    patch: (endpoint, body, options = {}) =>
        apiRequest(endpoint, {
            ...options,
            method: 'PATCH',
            body: JSON.stringify(body)
        }),

    delete: (endpoint, options = {}) =>
        apiRequest(endpoint, { ...options, method: 'DELETE' }),

    /**
     * Upload files through the gateway (multipart/form-data)
     */
    upload: (endpoint, formData, options = {}) => {
        const { headers = {}, ...rest } = options;
        // Don't set Content-Type for FormData — browser sets it with boundary
        delete headers['Content-Type'];
        return apiRequest(endpoint, {
            ...rest,
            method: 'POST',
            headers,
            body: formData
        });
    },

    /**
     * Request new gateway session tokens and store them in localStorage
     */
    initializeGatewaySession: async (email, uid) => {
        try {
            const response = await fetch(`${API_URL}/gateway/token`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Client-ID': CLIENT_ID,
                    'X-Client-Secret': CLIENT_SECRET
                },
                body: JSON.stringify({ email, uid })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Failed to exchange gateway tokens');
            }

            const data = await response.json();
            const payload = data.data || data;
            if (payload.accessToken && payload.refreshToken) {
                setTokens(payload.accessToken, payload.refreshToken);
                console.log('[API-CLIENT] Gateway session initialized successfully for:', email);
                return { accessToken: payload.accessToken, refreshToken: payload.refreshToken };
            } else {
                throw new Error('Incomplete token response from gateway');
            }
        } catch (error) {
            console.error('[API-CLIENT] Gateway session initialization failed:', error.message);
            throw error;
        }
    },

    // Token management utilities
    getTokens,
    setTokens,
    clearAuth: clearAuthAndRedirect,
    refreshToken: refreshAccessToken
};

/**
 * Asynchronously warm up the backend server in the background (non-blocking)
 */
export const pingBackendWarmup = async () => {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);
        await fetch(`${API_URL}/health`, {
            method: 'GET',
            signal: controller.signal,
            headers: {
                'X-Client-ID': CLIENT_ID,
                'X-Client-Secret': CLIENT_SECRET
            }
        }).catch(() => {});
        clearTimeout(timeoutId);
    } catch {
        // Silently ignore warmup errors
    }
};

apiClient.pingBackendWarmup = pingBackendWarmup;

export { CLIENT_ID, CLIENT_SECRET };
export default apiClient;
