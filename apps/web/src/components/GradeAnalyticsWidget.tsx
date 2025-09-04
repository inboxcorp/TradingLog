import React, { useState } from 'react';
import { 
  GradeAnalytics, 
  GradeLevel, 
  GRADE_COLORS, 
  GRADE_CATEGORIES,
  CoachingRecommendation 
} from '@trading-log/shared';
import { GradeBadge } from './TradeGrade';

interface GradeAnalyticsWidgetProps {
  gradeAnalytics: GradeAnalytics;
  coachingRecommendations?: CoachingRecommendation[];
  totalTrades: number;
  timeRange: 'week' | 'month' | 'quarter' | 'year' | 'all';
  onTimeRangeChange: (range: string) => void;
}

interface GradeDistributionChartProps {
  distribution: Record<GradeLevel, number>;
  totalTrades: number;
}

const GradeDistributionChart: React.FC<GradeDistributionChartProps> = ({ 
  distribution, 
  totalTrades 
}) => {
  if (totalTrades === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No graded trades available
      </div>
    );
  }

  const grades = Object.values(GradeLevel);
  const maxCount = Math.max(...Object.values(distribution));

  return (
    <div className="space-y-3">
      {grades.map((grade) => {
        const count = distribution[grade] || 0;
        const percentage = totalTrades > 0 ? (count / totalTrades) * 100 : 0;
        const barWidth = maxCount > 0 ? (count / maxCount) * 100 : 0;
        
        return (
          <div key={grade} className="flex items-center gap-3">
            <GradeBadge grade={grade} size="sm" />
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-700">{grade}</span>
                <span className="text-sm text-gray-600">
                  {count} ({percentage.toFixed(1)}%)
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="h-2 rounded-full transition-all duration-500"
                  style={{ 
                    width: `${barWidth}%`,
                    backgroundColor: GRADE_COLORS[grade]
                  }}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

interface GradeTrendIndicatorProps {
  trend: 'IMPROVING' | 'DECLINING' | 'STABLE';
  changeRate: number;
  recentAverage: number;
  historicalAverage: number;
}

const GradeTrendIndicator: React.FC<GradeTrendIndicatorProps> = ({
  trend,
  changeRate,
  recentAverage,
  historicalAverage
}) => {
  const getTrendIcon = () => {
    switch (trend) {
      case 'IMPROVING':
        return '📈';
      case 'DECLINING':
        return '📉';
      default:
        return '➡️';
    }
  };

  const getTrendColor = () => {
    switch (trend) {
      case 'IMPROVING':
        return 'text-green-600';
      case 'DECLINING':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">{getTrendIcon()}</span>
        <h3 className="font-semibold text-gray-900">Grade Trend</h3>
      </div>
      
      <div className={`text-lg font-bold ${getTrendColor()}`}>
        {trend.replace('_', ' ').toLowerCase()}
        {changeRate !== 0 && (
          <span className="text-sm ml-2">
            ({changeRate > 0 ? '+' : ''}{changeRate.toFixed(1)} points)
          </span>
        )}
      </div>
      
      <div className="mt-3 space-y-2 text-sm text-gray-600">
        <div className="flex justify-between">
          <span>Recent Average:</span>
          <span className="font-medium">{recentAverage.toFixed(1)}</span>
        </div>
        <div className="flex justify-between">
          <span>Historical Average:</span>
          <span className="font-medium">{historicalAverage.toFixed(1)}</span>
        </div>
      </div>
    </div>
  );
};

interface CoachingPanelProps {
  recommendations: CoachingRecommendation[];
}

const CoachingPanel: React.FC<CoachingPanelProps> = ({ recommendations }) => {
  if (recommendations.length === 0) {
    return (
      <div className="bg-green-50 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg">🎉</span>
          <h3 className="font-semibold text-green-900">Great Work!</h3>
        </div>
        <p className="text-sm text-green-800">
          Your trading performance is solid. Keep following your current approach!
        </p>
      </div>
    );
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'HIGH':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'MEDIUM':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      default:
        return 'bg-blue-50 border-blue-200 text-blue-800';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'HIGH':
        return '🚨';
      case 'MEDIUM':
        return '⚠️';
      default:
        return '💡';
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-lg">🎯</span>
        <h3 className="font-semibold text-gray-900">Coaching Recommendations</h3>
      </div>
      
      {recommendations.map((rec, index) => (
        <div key={index} className={`border rounded-lg p-3 ${getPriorityColor(rec.priority)}`}>
          <div className="flex items-center gap-2 mb-2">
            <span>{getPriorityIcon(rec.priority)}</span>
            <span className="font-medium text-sm">{rec.priority} Priority</span>
          </div>
          
          <p className="font-medium mb-2">{rec.message}</p>
          
          {rec.actionItems.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-1">Action Items:</p>
              <ul className="text-sm space-y-1">
                {rec.actionItems.map((item, itemIndex) => (
                  <li key={itemIndex} className="flex items-start gap-1">
                    <span>•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

const GradeAnalyticsWidget: React.FC<GradeAnalyticsWidgetProps> = ({
  gradeAnalytics,
  coachingRecommendations = [],
  totalTrades,
  timeRange,
  onTimeRangeChange
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'distribution' | 'coaching'>('overview');

  const timeRangeOptions = [
    { value: 'week', label: 'Week' },
    { value: 'month', label: 'Month' },
    { value: 'quarter', label: 'Quarter' },
    { value: 'year', label: 'Year' },
    { value: 'all', label: 'All Time' }
  ];

  const tabs = [
    { key: 'overview', label: 'Overview', icon: '📊' },
    { key: 'distribution', label: 'Distribution', icon: '📈' },
    { key: 'coaching', label: 'Coaching', icon: '🎯' }
  ];

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      <div className="border-b border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Grade Analytics</h2>
          <select
            value={timeRange}
            onChange={(e) => onTimeRangeChange(e.target.value)}
            className="text-sm border border-gray-300 rounded-md px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {timeRangeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === tab.key
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4">
        {activeTab === 'overview' && (
          <div className="space-y-4">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {gradeAnalytics.averageGrade.toFixed(1)}
                </div>
                <div className="text-sm text-gray-600">Average Grade</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {totalTrades}
                </div>
                <div className="text-sm text-gray-600">Total Graded Trades</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {(gradeAnalytics.correlations.gradeVsOutcome * 100).toFixed(0)}%
                </div>
                <div className="text-sm text-gray-600">Grade-Outcome Correlation</div>
              </div>
            </div>

            {/* Trend Indicator */}
            <GradeTrendIndicator
              trend={gradeAnalytics.gradeImprovement.trend}
              changeRate={gradeAnalytics.gradeImprovement.changeRate}
              recentAverage={gradeAnalytics.gradeImprovement.recentAverage}
              historicalAverage={gradeAnalytics.gradeImprovement.historicalAverage}
            />

            {/* Grade Categories Summary */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Grade Categories</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(GRADE_CATEGORIES).map(([category, grades]) => {
                  const count = grades.reduce((sum, grade) => sum + (gradeAnalytics.gradeDistribution[grade] || 0), 0);
                  const percentage = totalTrades > 0 ? (count / totalTrades) * 100 : 0;
                  
                  return (
                    <div key={category} className="text-center">
                      <div className="text-lg font-semibold text-gray-900">{count}</div>
                      <div className="text-sm text-gray-600 capitalize">{category.replace('_', ' ')}</div>
                      <div className="text-xs text-gray-500">{percentage.toFixed(1)}%</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'distribution' && (
          <GradeDistributionChart
            distribution={gradeAnalytics.gradeDistribution}
            totalTrades={totalTrades}
          />
        )}

        {activeTab === 'coaching' && (
          <CoachingPanel recommendations={coachingRecommendations} />
        )}
      </div>
    </div>
  );
};

export default GradeAnalyticsWidget;