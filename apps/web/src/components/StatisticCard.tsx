import React from 'react';

import { 
  BenchmarkLevel, 
  formatStatistic, 
  getBenchmarkLevel,
  PerformanceBenchmarks
} from '@trading-log/shared';

// Use shared utilities instead of local duplicates

// Simple icon components
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

const InformationCircleIcon = ({ className }: { className: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

export interface StatisticCardProps {
  title: string;
  value: number | string;
  format: 'currency' | 'percentage' | 'ratio' | 'number';
  trend?: 'up' | 'down' | 'neutral';
  description?: string;
  benchmark?: {
    type: keyof PerformanceBenchmarks;
    value: number;
  };
  className?: string;
  size?: 'small' | 'medium' | 'large';
  showBenchmark?: boolean;
}

const StatisticCard: React.FC<StatisticCardProps> = ({
  title,
  value,
  format,
  trend,
  description,
  benchmark,
  className = '',
  size = 'medium',
  showBenchmark = true
}) => {
  const formattedValue = typeof value === 'number' ? formatStatistic(value, format) : value;
  
  // Determine benchmark level for coloring
  let benchmarkLevel: BenchmarkLevel | null = null;
  if (benchmark && typeof value === 'number' && showBenchmark) {
    benchmarkLevel = getBenchmarkLevel(benchmark.type, value);
  }
  
  const trendIcon = trend === 'up' ? ArrowUpIcon : 
                   trend === 'down' ? ArrowDownIcon : MinusIcon;
  
  const trendColor = trend === 'up' ? 'text-green-500' : 
                    trend === 'down' ? 'text-red-500' : 'text-gray-400';
  
  const benchmarkColor = benchmarkLevel === 'excellent' ? 'text-green-600 bg-green-50' :
                        benchmarkLevel === 'good' ? 'text-blue-600 bg-blue-50' :
                        benchmarkLevel === 'acceptable' ? 'text-yellow-600 bg-yellow-50' :
                        benchmarkLevel === 'poor' ? 'text-red-600 bg-red-50' : 'text-gray-900';

  const valueColor = benchmarkLevel === 'excellent' ? 'text-green-700' :
                    benchmarkLevel === 'good' ? 'text-blue-700' :
                    benchmarkLevel === 'acceptable' ? 'text-yellow-700' :
                    benchmarkLevel === 'poor' ? 'text-red-700' : 'text-gray-900';

  const sizeClasses = {
    small: {
      container: 'p-3',
      title: 'text-xs',
      value: 'text-lg',
      description: 'text-xs'
    },
    medium: {
      container: 'p-4',
      title: 'text-sm',
      value: 'text-2xl',
      description: 'text-xs'
    },
    large: {
      container: 'p-6',
      title: 'text-base',
      value: 'text-3xl',
      description: 'text-sm'
    }
  };

  const classes = sizeClasses[size];

  return (
    <div className={`bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow duration-200 ${classes.container} ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <h3 className={`font-medium text-gray-500 ${classes.title}`}>{title}</h3>
          {benchmarkLevel && showBenchmark && (
            <div className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${benchmarkColor}`}>
              {benchmarkLevel}
            </div>
          )}
        </div>
        
        {trend && trend !== 'neutral' && (
          <div className={`flex items-center ${trendColor}`}>
            {React.createElement(trendIcon, { className: 'h-4 w-4' })}
          </div>
        )}
      </div>
      
      {/* Value */}
      <div className="mt-2">
        <div className={`font-semibold ${valueColor} ${classes.value}`}>
          {formattedValue}
        </div>
        
        {/* Description */}
        {description && (
          <p className={`text-gray-500 mt-1 ${classes.description}`}>
            {description}
          </p>
        )}
        
        {/* Benchmark Info */}
        {benchmark && showBenchmark && (
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
            <div className={`text-gray-400 ${classes.description}`}>
              Target: {formatStatistic(benchmark.value, format)}
            </div>
            {benchmarkLevel && (
              <div className="flex items-center text-gray-400">
                <InformationCircleIcon className="h-3 w-3 mr-1" />
                <span className={classes.description}>
                  {benchmarkLevel === 'excellent' ? 'Excellent' :
                   benchmarkLevel === 'good' ? 'Good' :
                   benchmarkLevel === 'acceptable' ? 'OK' : 'Poor'}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default StatisticCard;