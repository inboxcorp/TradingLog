import { useState, useEffect, useCallback, useRef } from 'react';

import { 
  TradeAnalyticsFilters,
  PerformanceStatistics,
  StatisticalSignificance,
  AnalyticsResponse
} from '@trading-log/shared';
import { analyticsApi } from '../lib/api';

interface UseAnalyticsOptions {
  debounceMs?: number;
  includeComparison?: boolean;
  includeSignificance?: boolean;
  pageSize?: number;
}

interface UseAnalyticsState {
  data: AnalyticsResponse | null;
  statistics: PerformanceStatistics | null;
  significance: StatisticalSignificance | null;
  loading: boolean;
  error: string | null;
  isInitialLoad: boolean;
}

interface UseAnalyticsReturn extends UseAnalyticsState {
  updateFilters: (filters: Partial<TradeAnalyticsFilters>) => void;
  clearFilters: () => void;
  refresh: () => void;
  filters: TradeAnalyticsFilters;
}

/**
 * Custom hook for managing analytics data with debounced updates and caching
 */
export const useAnalytics = (
  initialFilters: TradeAnalyticsFilters = {},
  options: UseAnalyticsOptions = {}
): UseAnalyticsReturn => {
  const {
    debounceMs = 300,
    includeComparison = true,
    includeSignificance = true,
    pageSize = 50
  } = options;

  const [state, setState] = useState<UseAnalyticsState>({
    data: null,
    statistics: null,
    significance: null,
    loading: false,
    error: null,
    isInitialLoad: true
  });

  const [filters, setFilters] = useState<TradeAnalyticsFilters>(initialFilters);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const currentRequestRef = useRef<Promise<void> | null>(null);

  /**
   * Loads analytics data with error handling and request deduplication
   */
  const loadAnalytics = useCallback(async (
    newFilters: TradeAnalyticsFilters,
    isOptimistic = false
  ) => {
    // Cancel any existing debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    // Don't start new request if we're already loading the same filters
    // (unless it's an optimistic update)
    if (!isOptimistic && state.loading && currentRequestRef.current) {
      return;
    }

    setState(prev => ({
      ...prev,
      loading: true,
      error: null,
      // Keep existing data during optimistic updates
      ...(isOptimistic && prev.data && {
        data: {
          ...prev.data,
          // You could add optimistic updates here
        }
      })
    }));

    const executeRequest = async () => {
      try {
        // Use the real analytics API
        const data = await analyticsApi.getAnalytics(newFilters, {
          includeComparison,
          page: 1,
          limit: pageSize
        });

        // Load statistical significance if requested and we have enough data
        let significance: StatisticalSignificance | null = null;
        if (includeSignificance && data.filteredCount >= 10) {
          const statsData = await analyticsApi.getPerformanceStatistics(newFilters, true);
          significance = statsData.significance;
        }

        // Only update state if this is still the current request
        if (currentRequestRef.current === requestPromise) {
          setState(prev => ({
            ...prev,
            data,
            statistics: data.statistics,
            significance,
            loading: false,
            error: null,
            isInitialLoad: false
          }));
          setFilters(newFilters);
        }
      } catch (error) {
        // Only update error if this is still the current request
        if (currentRequestRef.current === requestPromise) {
          setState(prev => ({
            ...prev,
            loading: false,
            error: error instanceof Error ? error.message : 'Failed to load analytics',
            isInitialLoad: false
          }));
        }
      }
    };

    const requestPromise = executeRequest();
    currentRequestRef.current = requestPromise;
    return requestPromise;
  }, [includeComparison, includeSignificance, pageSize, state.loading]);

  /**
   * Debounced filter update function
   */
  const debouncedLoadAnalytics = useCallback((newFilters: TradeAnalyticsFilters) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      loadAnalytics(newFilters);
    }, debounceMs);
  }, [loadAnalytics, debounceMs]);

  /**
   * Updates filters with debouncing and optimistic updates
   */
  const updateFilters = useCallback((partialFilters: Partial<TradeAnalyticsFilters>) => {
    const newFilters = { ...filters, ...partialFilters };
    
    // Immediate optimistic update for UI responsiveness
    setFilters(newFilters);
    
    // For simple filter changes, we can do optimistic updates
    const isSimpleFilter = Object.keys(partialFilters).every(key => 
      ['symbols', 'outcomes', 'tradeDirections'].includes(key)
    );

    if (isSimpleFilter && state.data) {
      // Perform optimistic update
      loadAnalytics(newFilters, true);
    } else {
      // Use debounced update for complex filters
      debouncedLoadAnalytics(newFilters);
    }
  }, [filters, loadAnalytics, debouncedLoadAnalytics, state.data]);

  /**
   * Clears all filters
   */
  const clearFilters = useCallback(() => {
    const emptyFilters = {};
    setFilters(emptyFilters);
    loadAnalytics(emptyFilters);
  }, [loadAnalytics]);

  /**
   * Refreshes current data
   */
  const refresh = useCallback(() => {
    loadAnalytics(filters);
  }, [loadAnalytics, filters]);

  // Load initial data
  useEffect(() => {
    loadAnalytics(initialFilters);
    
    // Cleanup function
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      currentRequestRef.current = null;
    };
  }, []); // Only run once on mount

  return {
    ...state,
    updateFilters,
    clearFilters,
    refresh,
    filters
  };
};

export default useAnalytics;