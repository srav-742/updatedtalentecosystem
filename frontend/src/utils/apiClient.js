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

const CLIENT_ID = import.meta.env.VITE_CLIENT_ID || 'hire1percent_web_client';
const CLIENT_SECRET = import.meta.env.VITE_CLIENT_SECRET || 'h1p_secret_2026_gateway_key';

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
        headers['ACCESS_TOKEN'] = accessToken;
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
    // IMPORTANT: Never clear session for Java API Gateway (port 9090) 401s —
    // those are gateway-level rejections, not Node backend session failures.
    const isGatewayUrl = url.includes(':9090');

    if (response.status === 401 && retry && !isGatewayUrl) {
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
     * Request new gateway session tokens and store them in localStorage.
     * This is BEST-EFFORT — it will NEVER throw or redirect to login.
     * Login always completes whether or not the gateway session succeeds.
     */
    initializeGatewaySession: async (email, uid, clientSecret = null) => {
        // Step 1: Try Java API Gateway OAuth (Port 9090)
        if (uid) {
            try {
                const clientId = `client_${uid}`;
                const storedSecret = localStorage.getItem('h1p_client_secret');
                const secretToUse = clientSecret || storedSecret || 'secret';
                const credentials = btoa(`${clientId}:${secretToUse}`);

                const res = await fetch('http://localhost:9090/oauth-service/oauth/authenticate', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Basic ${credentials}`,
                        'Content-Type': 'application/json'
                    }
                }).catch(() => null);

                if (res && res.ok) {
                    const authResponse = await res.json().catch(() => null);
                    if (authResponse && authResponse.accessToken) {
                        setTokens(authResponse.accessToken, authResponse.refreshToken || '');
                        console.log('[API-CLIENT] Java Gateway OAuth session initialized for:', clientId);
                        return { accessToken: authResponse.accessToken, refreshToken: authResponse.refreshToken };
                    }
                }
                console.warn('[API-CLIENT] Java Gateway OAuth skipped (not ok or no token). Trying Node fallback.');
            } catch (oauthErr) {
                console.warn('[API-CLIENT] Java Gateway OAuth error (non-fatal):', oauthErr.message);
            }
        }

        // Step 2: Fallback to Node Gateway token endpoint — also best-effort, never throws
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

            if (response.ok) {
                const data = await response.json().catch(() => null);
                const payload = data?.data || data;
                if (payload?.accessToken && payload?.refreshToken) {
                    setTokens(payload.accessToken, payload.refreshToken);
                    console.log('[API-CLIENT] Node gateway session initialized for:', email);
                    return { accessToken: payload.accessToken, refreshToken: payload.refreshToken };
                }
            } else {
                console.warn('[API-CLIENT] Node gateway/token returned non-ok status:', response.status);
            }
        } catch (nodeErr) {
            console.warn('[API-CLIENT] Node gateway token fetch failed (non-fatal):', nodeErr.message);
        }

        // Both failed — log warning but DO NOT throw or redirect.
        // The user session (localStorage.user) is already saved by LoginPage before this call.
        console.warn('[API-CLIENT] Gateway session initialization skipped — user session is intact.');
        return null;
    },

    // Token management utilities
    getTokens,
    setTokens,
    clearAuth: clearAuthAndRedirect,
    refreshToken: refreshAccessToken
};

export default apiClient;
export { apiRequest, getTokens, setTokens, clearAuthAndRedirect, refreshAccessToken, CLIENT_ID, CLIENT_SECRET };
