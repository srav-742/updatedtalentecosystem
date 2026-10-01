/**
 * Core Application Configuration
 * 
 * Centralized file for environment variables and API gateway credentials.
 * Decoupled from Firebase to prevent heavy SDK bundles from loading on public pages.
 */

export const API_URL = (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) ? 'http://localhost:5000/api' : (import.meta.env.VITE_API_URL || 'https://updatedtalentecosystem-kl0c.onrender.com/api');
export const CLIENT_ID = import.meta.env.VITE_CLIENT_ID || 'hire1percent_web_client';
export const CLIENT_SECRET = import.meta.env.VITE_CLIENT_SECRET || 'h1p_secret_2026_gateway_key';

export const SOCIAL_LINKS = {
  twitter: import.meta.env.VITE_TWITTER_URL || 'https://twitter.com/hire1percent',
  linkedin: import.meta.env.VITE_LINKEDIN_URL || 'https://linkedin.com/company/hire1percent',
  github: import.meta.env.VITE_GITHUB_URL || '', // Empty until official organization handle is registered
};
