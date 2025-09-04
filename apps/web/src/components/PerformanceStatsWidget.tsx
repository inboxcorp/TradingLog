import React, { useState } from 'react';

import { PerformanceStatistics, StatisticalSignificance, formatStatistic } from '@trading-log/shared';

// Remove duplicate type definitions and use shared types

// formatStatistic is now imported from shared package

// Simple icons as SVG components to avoid heroicons dependency
const ChartBarIcon = ({ className }: { className: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

const TrendingUpIcon = ({ className }: { className: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
  </svg>
);

const TrendingDownIcon = ({ className }: { className: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
  </svg>
);

const InformationCircleIcon = ({ className }: { className: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const ChevronDownIcon = ({ className }: { className: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);

const ChevronUpIcon = ({ className }: { className: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
  </svg>
);

const ArrowUpIcon = ({ className }: { className: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
  </svg>
);

const ArrowDownIcon = ({ className }: { className: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 13l-5 5m0 0l-5-5m5 5V6" />
  </svg>
);

const MinusIcon = ({ className }: { className: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
  </svg>
);

interface PerformanceStatsWidgetProps {
  statistics: PerformanceStatistics;
  loading?: boolean;
  showComparison?: boolean;
  compactView?: boolean;
  significance?: StatisticalSignificance;
}

interface StatisticCardProps {
  title: string;
  value: number | string;
  format: 'currency' | 'percentage' | 'ratio' | 'number';
  trend?: 'up' | 'down' | 'neutral';
  description?: string;
  benchmark?: number;
  className?: string;
}

const StatisticCard: React.FC<StatisticCardProps> = ({
  title,
  value,
  format,
  trend,
  description,
  benchmark,
  className = ''
}) => {
  const formattedValue = typeof value === 'number' ? formatStatistic(value, format) : value;
  
  // Determine benchmark level for coloring  
  let benchmarkLevel = null;
  if (benchmark !== undefined && typeof value === 'number') {
    if (value >= 70) benchmarkLevel = 'excellent';
    else if (value >= 60) benchmarkLevel = 'good'; 
    else if (value >= 50) benchmarkLevel = 'acceptable';
    else benchmarkLevel = 'poor';
  }
  
  const trendIcon = trend === 'up' ? ArrowUpIcon : 
                   trend === 'down' ? ArrowDownIcon : MinusIcon;
  
  const trendColor = trend === 'up' ? 'text-green-500' : 
                    trend === 'down' ? 'text-red-500' : 'text-gray-400';
  
  const benchmarkColor = benchmarkLevel === 'excellent' ? 'text-green-600' :
                        benchmarkLevel === 'good' ? 'text-blue-600' :
                        benchmarkLevel === 'acceptable' ? 'text-yellow-600' :
                        benchmarkLevel === 'poor' ? 'text-red-600' : 'text-gray-900';

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-4 ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-500">{title}</h3>
        {trend && (
          <div className={`flex items-center ${trendColor}`}>
            {React.createElement(trendIcon, { className: 'h-4 w-4' })}
          </div>
        )}
      </div>
      
      <div className="mt-2">
        <div className={`text-2xl font-semibold ${benchmarkColor}`}>
          {formattedValue}
        </div>
        
        {description && (
          <p className="text-xs text-gray-500 mt-1">{description}</p>
        )}
        
        {benchmark !== undefined && (
          <div className="text-xs text-gray-400 mt-1">
            Benchmark: {formatStatistic(benchmark, format)}
          </div>
        )}
      </div>
    </div>
  );
};

export const PerformanceStatsWidget: React.FC<PerformanceStatsWidgetProps> = ({
  statistics,
  loading = false,
  compactView = false,
  significance
}) => {
  const [isExpanded, setIsExpanded] = useState(!compactView);
  const [showAdvanced, setShowAdvanced] = useState(false);

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-gray-100 rounded-lg p-4">
                <div className="h-4 bg-gray-200 rounded w-2/3 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const primaryMetrics = [
    {
      title: 'Win Rate',
      value: statistics?.winRate || 0,
      format: 'percentage' as const,
      benchmark: 60,
      description: `${statistics?.winningTrades || 0}W/${statistics?.losingTrades || 0}L of ${statistics?.totalTrades || 0} trades`
    },
    {
      title: 'Total P/L',
      value: statistics?.totalPnL || 0,
      format: 'currency' as const,
      trend: (statistics?.totalPnL || 0) > 0 ? 'up' as const : 
             (statistics?.totalPnL || 0) < 0 ? 'down' as const : 'neutral' as const,
      description: `Average: ${formatStatistic(statistics?.averageTrade || 0, 'currency')}/trade`
    },
    {
      title: 'Profit Factor',
      value: statistics?.profitFactor || 0,
      format: 'ratio' as const,
      benchmark: 1.5,
      description: 'Gross Profit / Gross Loss'
    },
    {
      title: 'Expectancy',
      value: statistics?.expectancy || 0,
      format: 'currency' as const,
      benchmark: 0.01,
      description: 'Expected profit per trade'
    }
  ];

  const secondaryMetrics = [
    {
      title: 'Average Profit',
      value: statistics?.averageProfit || 0,
      format: 'currency' as const,
      description: `Max win: ${formatStatistic(statistics?.maxWin || 0, 'currency')}`
    },
    {
      title: 'Average Loss',
      value: statistics?.averageLoss || 0,
      format: 'currency' as const,
      description: `Max loss: ${formatStatistic(statistics?.maxLoss || 0, 'currency')}`
    },
    {
      title: 'Max Consecutive Wins',
      value: statistics?.maxConsecutiveWins || 0,
      format: 'number' as const,
      description: `Current: ${statistics?.currentStreak || 0} ${statistics?.streakType?.toLowerCase() || ''}`
    },
    {
      title: 'Max Consecutive Losses',
      value: statistics?.maxConsecutiveLosses || 0,
      format: 'number' as const,
      description: 'Maximum losing streak'
    },
    {
      title: 'Average Risk',
      value: statistics?.averageRisk || 0,
      format: 'currency' as const,
      description: 'Risk per trade'
    },
    {
      title: 'Risk-Adjusted Return',
      value: statistics?.riskAdjustedReturn || 0,
      format: 'ratio' as const,
      description: 'Return / Risk ratio'
    }
  ];

  const advancedMetrics = [
    {
      title: 'Sharpe Ratio',
      value: statistics?.sharpeRatio || 0,
      format: 'ratio' as const,
      description: 'Risk-adjusted performance'
    },
    {
      title: 'Max Drawdown',
      value: statistics?.maxDrawdown || 0,
      format: 'currency' as const,
      description: 'Maximum decline from peak'
    },
    {
      title: 'Recovery Factor',
      value: statistics?.recoveryFactor || 0,
      format: 'ratio' as const,
      description: 'Profit / Max Drawdown'
    },
    {
      title: 'Average Hold Time',
      value: statistics?.averageHoldTime || 0,
      format: 'number' as const,
      description: 'Hours per trade'
    },
    {
      title: 'Trading Frequency',
      value: statistics?.tradingFrequency || 0,
      format: 'ratio' as const,
      description: 'Trades per month'
    },
    {
      title: 'Win/Loss Ratio',
      value: statistics?.winLossRatio || 0,
      format: 'ratio' as const,
      description: 'Winning trades / Losing trades'
    }
  ];

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ChartBarIcon className="h-5 w-5 text-blue-500" />
            <h2 className="text-lg font-semibold text-gray-900">Performance Statistics</h2>
          </div>
          
          <div className="flex items-center space-x-2">
            {significance && !significance.isSignificant && (
              <div className="flex items-center text-amber-600">
                <InformationCircleIcon className="h-4 w-4 mr-1" />
                <span className="text-xs">Small sample</span>
              </div>
            )}
            
            {compactView && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {isExpanded ? (
                  <ChevronUpIcon className="h-4 w-4" />
                ) : (
                  <ChevronDownIcon className="h-4 w-4" />
                )}
              </button>
            )}
          </div>
        </div>
        
        {/* Statistical Significance Warning */}
        {significance && !significance.isSignificant && (
          <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-md">
            <div className="flex">
              <InformationCircleIcon className="h-5 w-5 text-amber-400 mt-0.5 mr-2" />
              <div className="text-sm text-amber-700">
                <p className="font-medium">Limited Statistical Significance</p>
                <p className="text-amber-600 mt-1">{significance.recommendation}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="p-6">
          {/* Primary Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {primaryMetrics.map((metric) => (
              <StatisticCard
                key={metric.title}
                title={metric.title}
                value={metric.value}
                format={metric.format}
                trend={metric.trend}
                description={metric.description}
                benchmark={metric.benchmark}
              />
            ))}
          </div>

          {/* Expandable Secondary Metrics */}
          <div className="border-t border-gray-100 pt-6">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center justify-between w-full text-left mb-4"
            >
              <h3 className="text-md font-medium text-gray-900">Detailed Metrics</h3>
              <div className="flex items-center text-gray-500">
                <span className="text-sm mr-2">
                  {showAdvanced ? 'Hide' : 'Show'} details
                </span>
                {showAdvanced ? (
                  <ChevronUpIcon className="h-4 w-4" />
                ) : (
                  <ChevronDownIcon className="h-4 w-4" />
                )}
              </div>
            </button>

            {showAdvanced && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                  {secondaryMetrics.map((metric) => (
                    <StatisticCard
                      key={metric.title}
                      title={metric.title}
                      value={metric.value}
                      format={metric.format}
                      description={metric.description}
                      className="bg-gray-50"
                    />
                  ))}
                </div>

                <div className="border-t border-gray-100 pt-6">
                  <h4 className="text-sm font-medium text-gray-700 mb-4">Advanced Analytics</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {advancedMetrics.map((metric) => (
                      <StatisticCard
                        key={metric.title}
                        title={metric.title}
                        value={metric.value}
                        format={metric.format}
                        description={metric.description}
                        className="bg-blue-50"
                      />
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Time-based Performance */}
          {statistics?.bestMonth && statistics.bestMonth !== 'N/A' && (
            <div className="border-t border-gray-100 pt-6">
              <h4 className="text-sm font-medium text-gray-700 mb-4">Time-based Performance</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-green-800">Best Month</p>
                    <p className="text-xs text-green-600">{statistics?.bestMonth}</p>
                  </div>
                  <TrendingUpIcon className="h-5 w-5 text-green-500" />
                </div>
                <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-red-800">Worst Month</p>
                    <p className="text-xs text-red-600">{statistics?.worstMonth}</p>
                  </div>
                  <TrendingDownIcon className="h-5 w-5 text-red-500" />
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PerformanceStatsWidget;