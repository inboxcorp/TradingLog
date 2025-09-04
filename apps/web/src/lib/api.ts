import axios, { AxiosError } from 'axios';
import { 
  User, 
  UpdateUserEquityRequest, 
  UserResponse, 
  Trade, 
  CreateTradeRequest,
  CreateMethodAnalysisRequest,
  MindsetTagType,
  IntensityLevel,
  CloseTradeRequest, 
  TradeResponse, 
  TradesResponse,
  PortfolioRiskResponse,
  AnalyzeAlignmentRequest,
  AlignmentAnalysisResponse,
  AlignmentAnalysis,
  TradeDirection,
  MethodAnalysis,
  TradeAnalyticsFilters,
  TradeGrade,
  GradeAnalytics,
  CoachingRecommendation,
  RecalculateGradeRequest
  // AnalyticsResponse,
  // PerformanceStatistics,
  // StatisticalSignificance,
  // ApiResponse
} from '@trading-log/shared';
import { supabase } from './supabase';
import { API_CONFIG, ERROR_MESSAGES } from '../config/constants';

// Enhanced trade request type with method analysis and mindset tags
export interface CreateTradeWithAnalysisRequest extends CreateTradeRequest {
  methodAnalysis?: CreateMethodAnalysisRequest[];
  mindsetTags?: Array<{ tag: MindsetTagType; intensity: IntensityLevel }>;
}

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

  /**
   * Get portfolio risk calculation
   */
  getPortfolioRisk: async (): Promise<PortfolioRiskResponse> => {
    const response = await apiClient.get<PortfolioRiskResponse>('/user/portfolio-risk');
    if (response.data.success) {
      return response.data;
    }
    throw new Error(response.data.error || 'Failed to fetch portfolio risk');
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
   * Create a new trade with optional method analysis
   */
  createTrade: async (tradeData: CreateTradeWithAnalysisRequest): Promise<Trade> => {
    const response = await apiClient.post<TradeResponse>('/trades', tradeData);
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.error || 'Failed to create trade');
  },

  /**
   * Update method analysis for a trade
   */
  updateMethodAnalysis: async (tradeId: string, analysis: CreateMethodAnalysisRequest[]): Promise<Trade> => {
    const response = await apiClient.patch<TradeResponse>(`/trades/${tradeId}/analysis`, analysis);
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.error || 'Failed to update method analysis');
  },

  /**
   * Update mindset tags for a trade
   */
  updateMindsetTags: async (tradeId: string, tags: Array<{ tag: MindsetTagType; intensity: IntensityLevel }>): Promise<Trade> => {
    const response = await apiClient.patch<TradeResponse>(`/trades/${tradeId}/mindset`, { tags });
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.error || 'Failed to update mindset tags');
  },

  /**
   * Close an active trade
   */
  closeTrade: async (tradeId: string, exitPrice: number): Promise<Trade> => {
    const request: CloseTradeRequest = { exitPrice };
    const response = await apiClient.post<TradeResponse>(`/trades/${tradeId}/close`, request);
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.error || 'Failed to close trade');
  },

  /**
   * Adjust stop-loss on an active trade
   */
  adjustStopLoss: async (tradeId: string, stopLoss: number): Promise<Trade> => {
    const request = { stopLoss };
    const response = await apiClient.patch<TradeResponse>(`/trades/${tradeId}`, request);
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.error || 'Failed to adjust stop-loss');
  },
};

export const alignmentApi = {
  /**
   * Analyze alignment between trade direction and method analysis
   */
  analyzeAlignment: async (direction: TradeDirection, methodAnalysis: MethodAnalysis[]): Promise<AlignmentAnalysis> => {
    const request: AnalyzeAlignmentRequest = { direction, methodAnalysis };
    const response = await apiClient.post<AlignmentAnalysisResponse>('/alignment/analyze', request);
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.error || 'Failed to analyze alignment');
  },
};

export const analyticsApi = {
  /**
   * Get comprehensive trade analytics with performance statistics
   */
  getAnalytics: async (
    filters?: TradeAnalyticsFilters,
    options?: {
      page?: number;
      limit?: number;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
      includeComparison?: boolean;
    }
  ): Promise<any> => {
    const params = new URLSearchParams();
    
    // Add filters to query params
    if (filters?.dateRange) {
      params.append('dateRange[startDate]', filters.dateRange.startDate.toISOString());
      params.append('dateRange[endDate]', filters.dateRange.endDate.toISOString());
    }
    
    if (filters?.symbols?.length) {
      filters.symbols.forEach(symbol => params.append('symbols', symbol));
    }
    
    if (filters?.indicators?.length) {
      filters.indicators.forEach(indicator => params.append('indicators', indicator));
    }
    
    if (filters?.signals?.length) {
      filters.signals.forEach(signal => params.append('signals', signal));
    }
    
    if (filters?.mindsetTags?.length) {
      filters.mindsetTags.forEach(tag => params.append('mindsetTags', tag));
    }
    
    if (filters?.outcomes?.length) {
      filters.outcomes.forEach(outcome => params.append('outcomes', outcome));
    }
    
    if (filters?.alignmentLevels?.length) {
      filters.alignmentLevels.forEach(level => params.append('alignmentLevels', level));
    }
    
    if (filters?.riskRange) {
      params.append('riskRange[min]', filters.riskRange.min.toString());
      params.append('riskRange[max]', filters.riskRange.max.toString());
    }
    
    if (filters?.tradeDirections?.length) {
      filters.tradeDirections.forEach(direction => params.append('tradeDirections', direction));
    }
    
    // Add options
    if (options?.page) params.append('page', options.page.toString());
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.sortBy) params.append('sortBy', options.sortBy);
    if (options?.sortOrder) params.append('sortOrder', options.sortOrder);
    if (options?.includeComparison) params.append('includeComparison', 'true');
    
    const response = await apiClient.get<any>(`/analytics?${params.toString()}`);
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.error || 'Failed to fetch analytics data');
  },

  /**
   * Get performance statistics only (lightweight endpoint)
   */
  getPerformanceStatistics: async (
    filters?: TradeAnalyticsFilters,
    includeSignificance = false
  ): Promise<any> => {
    const params = new URLSearchParams();
    
    // Add filters to query params (same as above)
    if (filters?.dateRange) {
      params.append('dateRange[startDate]', filters.dateRange.startDate.toISOString());
      params.append('dateRange[endDate]', filters.dateRange.endDate.toISOString());
    }
    
    if (filters?.symbols?.length) {
      filters.symbols.forEach(symbol => params.append('symbols', symbol));
    }
    
    if (filters?.indicators?.length) {
      filters.indicators.forEach(indicator => params.append('indicators', indicator));
    }
    
    if (filters?.signals?.length) {
      filters.signals.forEach(signal => params.append('signals', signal));
    }
    
    if (filters?.mindsetTags?.length) {
      filters.mindsetTags.forEach(tag => params.append('mindsetTags', tag));
    }
    
    if (filters?.outcomes?.length) {
      filters.outcomes.forEach(outcome => params.append('outcomes', outcome));
    }
    
    if (filters?.alignmentLevels?.length) {
      filters.alignmentLevels.forEach(level => params.append('alignmentLevels', level));
    }
    
    if (filters?.riskRange) {
      params.append('riskRange[min]', filters.riskRange.min.toString());
      params.append('riskRange[max]', filters.riskRange.max.toString());
    }
    
    if (filters?.tradeDirections?.length) {
      filters.tradeDirections.forEach(direction => params.append('tradeDirections', direction));
    }
    
    if (includeSignificance) {
      params.append('includeSignificance', 'true');
    }
    
    const response = await apiClient.get<any>(`/analytics/statistics?${params.toString()}`);
    
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.error || 'Failed to fetch performance statistics');
  }
};

export const gradingApi = {
  /**
   * Calculate grade for a specific trade
   */
  async calculateGrade(tradeId: string, reason?: string): Promise<TradeGrade> {
    const requestBody: RecalculateGradeRequest = { reason: reason as any || 'MANUAL_RECALC' };
    const response = await apiClient.post<{ success: boolean; data: TradeGrade }>(
      `/grading/${tradeId}/calculate`, 
      requestBody
    );
    
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error('Failed to calculate trade grade');
  },

  /**
   * Get grade for a specific trade
   */
  async getTradeGrade(tradeId: string): Promise<TradeGrade & { history?: any[] }> {
    const response = await apiClient.get<{ success: boolean; data: TradeGrade & { history?: any[] } }>(
      `/grading/${tradeId}`
    );
    
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error('Failed to fetch trade grade');
  },

  /**
   * Get grade analytics for user
   */
  async getGradeAnalytics(timeRange: string = 'all'): Promise<{
    analytics: GradeAnalytics;
    coachingRecommendations: CoachingRecommendation[];
    totalTrades: number;
  }> {
    const response = await apiClient.get<{
      success: boolean;
      data: {
        analytics: GradeAnalytics;
        coachingRecommendations: CoachingRecommendation[];
        totalTrades: number;
      };
    }>(`/grading?timeRange=${timeRange}`);
    
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error('Failed to fetch grade analytics');
  }
};

export default apiClient;