/**
 * Core application configuration.
 */

const isLocalHost = typeof window !== 'undefined'
  && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
const configuredApiUrl = import.meta.env.VITE_API_URL?.trim();

if (typeof window !== 'undefined' && import.meta.env.PROD && !isLocalHost && !configuredApiUrl) {
  throw new Error('VITE_API_URL must be configured for production.');
}

export const API_URL = (isLocalHost && (!configuredApiUrl || !configuredApiUrl.includes('localhost')))
  ? 'http://localhost:5000/api'
  : (configuredApiUrl || 'http://localhost:5000/api');
export const CLIENT_ID = import.meta.env.VITE_CLIENT_ID || 'hire1percent_web_client';

export const getGatewayHeaders = () => {
  return { 'X-Client-ID': CLIENT_ID };
};

export const SOCIAL_LINKS = {
  twitter: import.meta.env.VITE_TWITTER_URL || 'https://twitter.com/hire1percent',
  linkedin: import.meta.env.VITE_LINKEDIN_URL || 'https://linkedin.com/company/hire1percent',
  github: import.meta.env.VITE_GITHUB_URL || ''
};
