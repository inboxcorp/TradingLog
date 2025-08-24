/**
 * Application constants and configuration
 * Centralized location for all configuration values
 */

export const API_CONFIG = {
  BASE_URL: 'http://localhost:3001/api',
  TIMEOUT: 10000, // 10 seconds
  RETRY_ATTEMPTS: 3,
} as const;

export const SUPABASE_CONFIG = {
  URL: import.meta.env.VITE_SUPABASE_URL || 'http://localhost:54321',
  ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY || 'dev-anon-key',
} as const;

export const EQUITY_VALIDATION = {
  MIN_VALUE: 0,
  MAX_VALUE: 1000000000, // $1B
  DECIMAL_PLACES: 2,
} as const;

export const UI_CONFIG = {
  FORM_TIMEOUT: 30000, // 30 seconds
  DEFAULT_EQUITY: 10000, // $10,000
  CURRENCY: 'USD',
  LOCALE: 'en-US',
} as const;

export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network error - please check your connection',
  AUTH_REQUIRED: 'Authentication required',
  INVALID_EQUITY: 'Invalid equity value',
  GENERIC_ERROR: 'An unexpected error occurred',
} as const;