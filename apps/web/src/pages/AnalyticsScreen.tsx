import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import PerformanceStatsWidget from '../components/PerformanceStatsWidget';
import GradeAnalyticsWidget from '../components/GradeAnalyticsWidget';
import { useAnalytics } from '../hooks/useAnalytics';
import { gradingApi } from '../lib/api';

// Local type definitions removed - no longer needed


// Main Analytics Screen Component
const AnalyticsScreen: React.FC = () => {
  const [filterPanelOpen, setFilterPanelOpen] = useState(true);
  const [gradeTimeRange, setGradeTimeRange] = useState<string>('all');

  // Use the custom analytics hook with debouncing and optimistic updates
  const {
    data: analyticsData,
    statistics,
    significance,
    loading,
    error,
    isInitialLoad,
    refresh
  } = useAnalytics({}, {
    debounceMs: 300,
    includeComparison: true,
    includeSignificance: true,
    pageSize: 50
  });
  
  // Grade analytics query
  const { 
    data: gradeData,
    isLoading: gradeLoading,
    error: gradeError 
  } = useQuery({
    queryKey: ['grade-analytics', gradeTimeRange],
    queryFn: () => gradingApi.getGradeAnalytics(gradeTimeRange),
    refetchOnWindowFocus: false,
  });
  
  const exportResults = (format: 'CSV' | 'JSON') => {
    if (!analyticsData) return;
    
    if (format === 'JSON') {
      // Export complete analytics data
      const dataStr = JSON.stringify(analyticsData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `trade-analytics-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } else {
      // Export trades as CSV
      const headers = ['Symbol', 'Direction', 'Entry Date', 'Exit Date', 'Entry Price', 'Exit Price', 'P/L', 'Risk Amount', 'Outcome'];
      const csvData = [
        headers.join(','),
        ...analyticsData.trades.map((trade: any) => [
          trade.symbol,
          trade.direction,
          new Date(trade.entryDate).toLocaleDateString(),
          trade.exitDate ? new Date(trade.exitDate).toLocaleDateString() : 'Active',
          trade.entryPrice,
          trade.exitPrice || 'N/A',
          trade.realizedPnL || 'N/A',
          trade.riskAmount,
          trade.outcome
        ].join(','))
      ].join('\n');
      
      const csvBlob = new Blob([csvData], { type: 'text/csv' });
      const url = URL.createObjectURL(csvBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `trade-analytics-${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Trade Analytics</h1>
          <p className="mt-1 text-sm text-gray-500">
            Analyze your trading performance with advanced filtering
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          <button
            onClick={refresh}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            disabled={loading}
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
                Loading...
              </>
            ) : (
              'Refresh'
            )}
          </button>
          
          <button
            onClick={() => exportResults('CSV')}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            disabled={!analyticsData?.trades.length}
          >
            Export CSV
          </button>
          
          <button
            onClick={() => exportResults('JSON')}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            disabled={!analyticsData?.trades.length}
          >
            Export JSON
          </button>
        </div>
      </div>
        <div className="flex gap-6">
          {/* Filter Panel */}
          <div className={`${filterPanelOpen ? 'w-80' : 'w-12'} transition-all duration-200 flex-shrink-0`}>
            <div className="bg-white rounded-lg shadow-sm border h-fit">
              {/* Filter Panel Header */}
              <div className="flex items-center justify-between p-4 border-b">
                <h2 className={`font-semibold text-gray-900 ${filterPanelOpen ? '' : 'hidden'}`}>
                  Filters
                </h2>
                <button
                  onClick={() => setFilterPanelOpen(!filterPanelOpen)}
                  className="p-1 rounded hover:bg-gray-100"
                >
                  <svg className={`w-5 h-5 transition-transform ${filterPanelOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
              
              {/* Filter Content */}
              {filterPanelOpen && (
                <div className="p-4">
                  <p className="text-sm text-gray-500">
                    Filter functionality will be connected once imports are resolved.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 space-y-6">
            {/* Performance Statistics Widget */}
            <PerformanceStatsWidget
              statistics={statistics || {} as any}
              loading={loading || isInitialLoad}
              significance={significance || undefined}
            />

            {/* Grade Analytics Widget */}
            {gradeData ? (
              <GradeAnalyticsWidget
                gradeAnalytics={gradeData.analytics}
                coachingRecommendations={gradeData.coachingRecommendations}
                totalTrades={gradeData.totalTrades}
                timeRange={gradeTimeRange as 'week' | 'month' | 'quarter' | 'year' | 'all'}
                onTimeRangeChange={setGradeTimeRange}
              />
            ) : (<></>)}

            {/* Grade Analytics Loading State */}
            {gradeLoading && (
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <span className="ml-3 text-gray-600">Loading grade analytics...</span>
                </div>
              </div>
            )}

            {/* Grade Analytics Error State */}
            {gradeError && (
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                <div className="rounded-md bg-yellow-50 p-4">
                  <div className="text-sm text-yellow-700">
                    Grade analytics not available. Complete some trades to see your performance grades.
                  </div>
                </div>
              </div>
            )}

            {/* Trade Results Area */}
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="px-6 py-4 border-b">
                <h3 className="text-lg font-medium text-gray-900">Trade Results</h3>
                {analyticsData && (
                  <p className="text-sm text-gray-500">
                    Showing {analyticsData.filteredCount} of {analyticsData.totalCount} trades
                  </p>
                )}
              </div>
              
              <div className="p-6">
                {loading && (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                    <span className="ml-3 text-gray-600">Loading analytics...</span>
                  </div>
                )}
                
                {error && (
                  <div className="rounded-md bg-red-50 p-4">
                    <div className="text-sm text-red-700">{error}</div>
                  </div>
                )}
                
                {analyticsData && !loading && !error && (
                  <div className="space-y-4">
                    {analyticsData.trades.length === 0 ? (
                      <div className="text-center py-12">
                        <p className="text-gray-500">No trades match the current filters.</p>
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500">
                        Trade table will be implemented in Task 5
                        <br />
                        Currently showing {analyticsData.trades.length} trades
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
    </div>
  );
};

export default AnalyticsScreen;