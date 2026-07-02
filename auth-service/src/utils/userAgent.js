/**
 * @fileoverview User Agent parsing helper
 * @module utils/userAgent
 */

/**
 * Extracts browser name and device type from a User-Agent string.
 *
 * @param {string} uaString - Raw User-Agent string.
 * @returns {Object} Object containing { browser, device }
 */
export const parseUserAgent = (uaString) => {
  let browser = 'Unknown';
  let device = 'Desktop';

  if (!uaString) return { browser, device };

  // Parse Browser
  if (uaString.includes('Firefox')) browser = 'Firefox';
  else if (uaString.includes('Chrome') && !uaString.includes('Edg')) browser = 'Chrome';
  else if (uaString.includes('Safari') && !uaString.includes('Chrome')) browser = 'Safari';
  else if (uaString.includes('Edg')) browser = 'Edge';
  else if (uaString.includes('MSIE') || uaString.includes('Trident')) browser = 'IE';

  // Parse Device
  if (uaString.includes('Mobi') || uaString.includes('Android') || uaString.includes('iPhone')) {
    device = 'Mobile';
  } else if (uaString.includes('iPad')) {
    device = 'Tablet';
  } else {
    device = 'Desktop';
  }

  return { browser, device };
};

export default parseUserAgent;
