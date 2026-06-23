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

import { API_URL } from '../firebase';

const CLIENT_ID = import.meta.env.VITE_CLIENT_ID || '';
const CLIENT_SECRET = import.meta.env.VITE_CLIENT_SECRET || '';

/**
 * Get stored tokens from localStorage
 */
const getTokens = () => {
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
const setTokens = (accessToken, refreshToken) => {
    if (accessToken) localStorage.setItem('accessToken', accessToken);
    if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
};

/**
 * Clear all auth data and redirect to login
 */
const clearAuthAndRedirect = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    window.location.href = '/login';
};

/**
 * Refresh the access token using the refresh token
 */
const refreshAccessToken = async () => {
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
    setTokens(data.accessToken, null); // Only update access token
    return data.accessToken;
};

/**
 * Make an authenticated API request through the gateway
 * 
 * @param {string} endpoint - API endpoint (e.g., '/jobs', '/profile/123')
 * @param {object} options - Fetch options (method, body, etc.)
 * @param {boolean} retry - Internal flag to prevent infinite retry loops
 * @returns {Promise<Response>}
 */
const apiRequest = async (endpoint, options = {}, retry = true) => {
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

    const response = await fetch(url, {
        ...options,
        headers
    });

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

    // Token management utilities
    getTokens,
    setTokens,
    clearAuth: clearAuthAndRedirect,
    refreshToken: refreshAccessToken
};

export default apiClient;
export { apiRequest, getTokens, setTokens, clearAuthAndRedirect, refreshAccessToken, CLIENT_ID, CLIENT_SECRET };
