/**
 * API Client — Centralized HTTP wrapper for the API Gateway.
 */

import { API_URL, CLIENT_ID, CLIENT_SECRET, getGatewayHeaders } from '../config';

export const getTokens = () => {
    try {
        return {
            accessToken: localStorage.getItem('accessToken'),
            refreshToken: localStorage.getItem('refreshToken')
        };
    } catch {
        return { accessToken: null, refreshToken: null };
    }
};

export const setTokens = (accessToken, refreshToken) => {
    if (accessToken) localStorage.setItem('accessToken', accessToken);
    if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
};

export const clearAuthAndRedirect = () => {
    if (window.location.pathname.includes('/candidate/apply')) {
        localStorage.removeItem('accessToken');
        console.warn('[API-CLIENT] Suppressed redirect while candidate is in an active assessment.');
        return;
    }

    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    window.location.href = '/login';
};

export const refreshAccessToken = async () => {
    const { refreshToken } = getTokens();
    if (!refreshToken) {
        throw new Error('No refresh token available');
    }

    const response = await fetch(`${API_URL}/gateway/refresh`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...getGatewayHeaders()
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
    setTokens(payload.accessToken, null);
    return payload.accessToken;
};

export const apiRequest = async (endpoint, options = {}, retry = true) => {
    const { accessToken, refreshToken } = getTokens();
    const url = endpoint.startsWith('http') ? endpoint : `${API_URL}${endpoint}`;
    const {
        timeout: timeoutMs = 12000,
        ...fetchOptions
    } = options;
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
        ...getGatewayHeaders()
    };

    if (accessToken && !headers.Authorization) {
        headers.Authorization = `Bearer ${accessToken}`;
    }
    if (accessToken) {
        headers.ACCESS_TOKEN = accessToken;
    }
    if (refreshToken) {
        headers['X-Refresh-Token'] = refreshToken;
    }

    const controller = options.signal ? null : new AbortController();
    const timeoutId = controller
        ? setTimeout(() => controller.abort(), timeoutMs)
        : null;

    let response;
    try {
        response = await fetch(url, {
            ...fetchOptions,
            signal: options.signal || controller?.signal,
            headers
        });
    } finally {
        if (timeoutId) clearTimeout(timeoutId);
    }

    const newToken = response.headers.get('X-New-Access-Token');
    if (newToken) setTokens(newToken, null);

    const isJavaGatewayUrl = url.includes(':9090');
    if (response.status === 401 && retry && !isJavaGatewayUrl) {
        try {
            const responseData = await response.clone().json().catch(() => ({}));

            if (responseData.code === 'TOKEN_EXPIRED' || responseData.code === 'INVALID_TOKEN') {
                await refreshAccessToken();
                return apiRequest(endpoint, options, false);
            }

            if (responseData.code === 'SESSION_EXPIRED') {
                clearAuthAndRedirect();
            }
        } catch (refreshError) {
            console.error('[API-CLIENT] Token refresh failed:', refreshError.message);
            clearAuthAndRedirect();
        }
    }

    return response;
};

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

    upload: (endpoint, formData, options = {}) => {
        const { headers = {}, ...rest } = options;
        const uploadHeaders = { ...headers };
        delete uploadHeaders['Content-Type'];
        return apiRequest(endpoint, {
            ...rest,
            method: 'POST',
            headers: uploadHeaders,
            body: formData
        });
    },

    initializeGatewaySession: async (email, uid) => {
        try {
            const { auth } = await import('../firebase');
            const firebaseUser = auth.currentUser;
            if (!firebaseUser) {
                throw new Error('No authenticated Firebase user is available for gateway token exchange.');
            }

            const firebaseIdToken = await firebaseUser.getIdToken();
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 12000);
            let response;
            try {
                response = await fetch(`${API_URL}/gateway/token`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${firebaseIdToken}`,
                        ...getGatewayHeaders()
                    },
                    body: JSON.stringify({ email, uid }),
                    signal: controller.signal
                });
            } finally {
                clearTimeout(timeoutId);
            }

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `Gateway token request failed (${response.status})`);
            }

            const data = await response.json();
            const payload = data.data || data;
            if (!payload.accessToken || !payload.refreshToken) {
                throw new Error('Incomplete token response from gateway');
            }

            setTokens(payload.accessToken, payload.refreshToken);
            return { accessToken: payload.accessToken, refreshToken: payload.refreshToken };
        } catch (error) {
            console.warn('[API-CLIENT] Gateway session initialization failed; Firebase login remains active:', error.message);
            return null;
        }
    },

    getTokens,
    setTokens,
    clearAuth: clearAuthAndRedirect,
    refreshToken: refreshAccessToken
};

export const pingBackendWarmup = async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);
    try {
        const response = await fetch(`${API_URL}/health`, {
            method: 'GET',
            signal: controller.signal,
            headers: getGatewayHeaders()
        });
        if (!response.ok) {
            console.warn(`[API-CLIENT] Backend warmup returned HTTP ${response.status}.`);
        }
    } catch (error) {
        if (error.name !== 'AbortError') {
            console.warn('[API-CLIENT] Backend warmup failed:', error.message);
        }
    } finally {
        clearTimeout(timeoutId);
    }
};

apiClient.pingBackendWarmup = pingBackendWarmup;

export { API_URL, CLIENT_ID, CLIENT_SECRET };
export default apiClient;
