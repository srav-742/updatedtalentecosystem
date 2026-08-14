/**
 * Cookie Manager for Hire1Percent
 * Handles local storage based cookie consent tracking.
 */

const CONSENT_KEY = "h1p_cookie_consent";

export const cookieManager = {
    /**
     * Set user consent status
     * @param {Object} preferences - Consent preferences
     */
    setConsent: (preferences = { accepted: true, timestamp: new Date().toISOString() }) => {
        localStorage.setItem(CONSENT_KEY, JSON.stringify(preferences));
    },

    /**
     * Get user consent status
     * @returns {Object|null}
     */
    getConsent: () => {
        const consent = localStorage.getItem(CONSENT_KEY);
        return consent ? JSON.parse(consent) : null;
    },

    /**
     * Check if consent has been given
     * @returns {boolean}
     */
    hasConsent: () => {
        return !!localStorage.getItem(CONSENT_KEY);
    },

    /**
     * Clear consent (for testing or reset)
     */
    clearConsent: () => {
        localStorage.removeItem(CONSENT_KEY);
    }
};

export default cookieManager;
