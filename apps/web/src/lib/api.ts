import axios, { AxiosError } from 'axios';
import { 
  User, 
  UpdateUserEquityRequest, 
  UserResponse, 
  Trade, 
  CreateTradeRequest, 
  TradeResponse, 
  TradesResponse 
} from '@trading-log/shared';
import { supabase } from './supabase';
import { API_CONFIG, ERROR_MESSAGES } from '../config/constants';

/**
 * Custom error class for API errors with better context
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: API_CONFIG.TIMEOUT,
});

// Add auth token to requests
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || 'dev-token';
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Error getting auth token:', error);
      // Fallback to dev token for development
      config.headers.Authorization = 'Bearer dev-token';
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Add response interceptor for better error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response) {
      // Server responded with error status
      const message = (error.response.data as any)?.error || 'An error occurred';
      throw new ApiError(message, error.response.status, error.response.data);
    } else if (error.request) {
      // Network error
      throw new ApiError(ERROR_MESSAGES.NETWORK_ERROR);
    } else {
      // Other error
      throw new ApiError(error.message || ERROR_MESSAGES.GENERIC_ERROR);
    }
  }
);

// API functions
export const userApi = {
  /**
   * Get current user data
   */
  getUser: async (): Promise<User> => {
    const response = await apiClient.get<UserResponse>('/user');
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.error || 'Failed to fetch user');
  },

  /**
   * Update user equity
   */
  updateEquity: async (equity: number): Promise<User> => {
    const request: UpdateUserEquityRequest = { totalEquity: equity };
    const response = await apiClient.patch<UserResponse>('/user', request);
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.error || 'Failed to update equity');
  },
};

export const tradeApi = {
  /**
   * Get user's trades with optional filtering
   */
  getTrades: async (status?: 'ACTIVE' | 'CLOSED' | 'ALL'): Promise<Trade[]> => {
    const params = status && status !== 'ALL' ? { status } : {};
    const response = await apiClient.get<TradesResponse>('/trades', { params });
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.error || 'Failed to fetch trades');
  },

  /**
   * Create a new trade
   */
  createTrade: async (tradeData: CreateTradeRequest): Promise<Trade> => {
    const response = await apiClient.post<TradeResponse>('/trades', tradeData);
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.error || 'Failed to create trade');
  },
};

export default apiClient;