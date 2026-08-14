import crypto from 'node:crypto';
import { v4 as uuidv4 } from 'uuid';

// UUID helpers
export const generateUuid = () => uuidv4();
export const isValidUuid = (uuid) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return typeof uuid === 'string' && uuidRegex.test(uuid);
};

// Date & Time helpers
export const formatDate = (date, format = 'ISO') => {
  const d = new Date(date);
  if (isNaN(d.getTime())) return null;
  return format === 'ISO' ? d.toISOString() : d.toUTCString();
};
export const getTimestamp = () => Date.now();

// Sleep helper
export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Retry helper
export const retry = async (fn, retries = 3, delayMs = 1000, onRetry = null) => {
  let lastError;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (onRetry) onRetry(err, i + 1);
      if (i < retries - 1) {
        await sleep(delayMs);
      }
    }
  }
  throw lastError;
};

// Object helpers
export const deepClone = (obj) => {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime());
  if (Array.isArray(obj)) return obj.map(deepClone);
  
  const cloned = {};
  for (const key of Object.keys(obj)) {
    cloned[key] = deepClone(obj[key]);
  }
  return cloned;
};

export const merge = (target, source) => {
  if (!target || typeof target !== 'object') return source;
  if (!source || typeof source !== 'object') return target;

  const result = deepClone(target);
  for (const key of Object.keys(source)) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = merge(result[key] || {}, source[key]);
    } else {
      result[key] = deepClone(source[key]);
    }
  }
  return result;
};

// String helpers
export const camelCase = (str) => {
  if (typeof str !== 'string') return '';
  return str
    .toLowerCase()
    .replace(/[-_]+/g, ' ')
    .replace(/[^\w\s]/g, '')
    .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => index === 0 ? word.toLowerCase() : word.toUpperCase())
    .replace(/\s+/g, '');
};

export const snakeCase = (str) => {
  if (typeof str !== 'string') return '';
  return str
    .replace(/\s+/g, '_')
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '');
};

// Crypto wrappers
export const hash = (str, algorithm = 'sha256') => {
  if (typeof str !== 'string') return '';
  return crypto.createHash(algorithm).update(str).digest('hex');
};

export const encrypt = (text, secretKey) => {
  if (!text || !secretKey) throw new Error('Text and secretKey are required for encryption');
  const iv = crypto.randomBytes(16);
  const key = crypto.createHash('sha256').update(secretKey).digest();
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return `${iv.toString('hex')}:${encrypted}`;
};

export const decrypt = (encryptedText, secretKey) => {
  if (!encryptedText || !secretKey) throw new Error('Encrypted text and secretKey are required for decryption');
  const [ivHex, encrypted] = encryptedText.split(':');
  if (!ivHex || !encrypted) throw new Error('Invalid encrypted text format');
  
  const iv = Buffer.from(ivHex, 'hex');
  const key = crypto.createHash('sha256').update(secretKey).digest();
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
};

// Safe JSON parse helper
export const safeJsonParse = (str, fallback = null) => {
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
};

export default {
  generateUuid,
  isValidUuid,
  formatDate,
  getTimestamp,
  sleep,
  retry,
  deepClone,
  merge,
  camelCase,
  snakeCase,
  hash,
  encrypt,
  decrypt,
  safeJsonParse,
};
