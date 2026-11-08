/**
 * Core application configuration.
 */

const isLocalHost = typeof window !== 'undefined'
  && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
const configuredApiUrl = import.meta.env.VITE_API_URL?.trim();

if (typeof window !== 'undefined' && import.meta.env.PROD && !isLocalHost && !configuredApiUrl) {
  throw new Error('VITE_API_URL must be configured for production.');
}

export const API_URL = configuredApiUrl || (isLocalHost ? 'http://localhost:5000/api' : '');
export const CLIENT_ID = import.meta.env.VITE_CLIENT_ID;
export const CLIENT_SECRET = import.meta.env.VITE_CLIENT_SECRET;

export const getGatewayHeaders = () => {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    throw new Error('VITE_CLIENT_ID and VITE_CLIENT_SECRET must be configured for gateway requests.');
  }

  return {
    'X-Client-ID': CLIENT_ID,
    'X-Client-Secret': CLIENT_SECRET
  };
};

export const SOCIAL_LINKS = {
  twitter: import.meta.env.VITE_TWITTER_URL || 'https://twitter.com/hire1percent',
  linkedin: import.meta.env.VITE_LINKEDIN_URL || 'https://linkedin.com/company/hire1percent',
  github: import.meta.env.VITE_GITHUB_URL || ''
};
