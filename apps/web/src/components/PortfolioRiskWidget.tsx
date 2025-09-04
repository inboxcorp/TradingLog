import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { RiskLevel, formatCurrency } from '@trading-log/shared';
import { userApi } from '../lib/api';

interface PortfolioRiskWidgetProps {
  className?: string;
  onRefresh?: () => void;
}

const getRiskLevelStyle = (riskLevel: RiskLevel) => {
  switch (riskLevel) {
    case 'SAFE':
      return {
        backgroundColor: 'bg-emerald-500',
        textColor: 'text-white',
        borderColor: 'border-emerald-200',
        icon: '🛡️'
      };
    case 'WARNING':
      return {
        backgroundColor: 'bg-amber-500',
        textColor: 'text-white',
        borderColor: 'border-amber-200',
        icon: '⚠️'
      };
    case 'DANGER':
      return {
        backgroundColor: 'bg-red-500',
        textColor: 'text-white',
        borderColor: 'border-red-200',
        icon: '🚨'
      };
  }
};

export const PortfolioRiskWidget: React.FC<PortfolioRiskWidgetProps> = ({ 
  className = '', 
  onRefresh 
}) => {
  const { 
    data: portfolioRiskData, 
    isLoading, 
    error, 
    refetch 
  } = useQuery({
    queryKey: ['portfolio-risk'],
    queryFn: userApi.getPortfolioRisk,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const handleRefresh = () => {
    refetch();
    onRefresh?.();
  };

  if (isLoading) {
    return (
      <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
        <div className="text-center">
          <div className="text-red-600 mb-2">⚠️</div>
          <p className="text-sm text-gray-600 mb-3">Failed to load portfolio risk</p>
          <button
            onClick={handleRefresh}
            className="text-sm text-blue-600 hover:text-blue-700 underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!portfolioRiskData?.data) {
    return null;
  }

  const portfolioRisk = portfolioRiskData.data;
  const style = getRiskLevelStyle(portfolioRisk.riskLevel);
  const progressPercentage = Math.min((portfolioRisk.totalRiskPercentage / 6) * 100, 100);

  return (
    <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Portfolio Risk</h3>
        <button
          onClick={handleRefresh}
          className="text-gray-400 hover:text-gray-600 p-1"
          aria-label="Refresh portfolio risk"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      <div className="space-y-4">
        {/* Total Risk Display */}
        <div className={`rounded-lg p-4 ${style.backgroundColor} ${style.textColor}`}>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm opacity-90">Total Risk</div>
              <div className="text-2xl font-bold">
                {formatCurrency(portfolioRisk.totalRiskAmount)}
              </div>
              <div className="text-sm opacity-90">
                {portfolioRisk.totalRiskPercentage.toFixed(2)}% of equity
              </div>
            </div>
            <div className="text-3xl">
              {style.icon}
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Risk vs 6% Limit</span>
            <span className="font-medium">
              {portfolioRisk.totalRiskPercentage.toFixed(1)}% / 6.0%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${
                portfolioRisk.riskLevel === 'DANGER' ? 'bg-red-500' :
                portfolioRisk.riskLevel === 'WARNING' ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500">
            <span>0%</span>
            <span className="text-amber-600">4.5%</span>
            <span className="text-red-600">6%</span>
          </div>
        </div>

        {/* Active Trades Breakdown */}
        {portfolioRisk.activeTrades.length > 0 && (
          <div className="border-t pt-4">
            <div className="flex justify-between items-center mb-2">
              <h4 className="text-sm font-medium text-gray-700">
                Active Trades ({portfolioRisk.activeTrades.length})
              </h4>
            </div>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {portfolioRisk.activeTrades.map((trade) => (
                <div key={trade.id} className="flex justify-between items-center text-sm">
                  <span className="text-gray-600 font-mono">{trade.symbol}</span>
                  <div className="text-right">
                    <div className="font-medium">{formatCurrency(trade.riskAmount)}</div>
                    <div className="text-xs text-gray-500">
                      {trade.riskPercentage.toFixed(2)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Educational Note */}
        {portfolioRisk.activeTrades.length === 0 && (
          <div className="text-center py-4 text-gray-500">
            <div className="text-2xl mb-2">📊</div>
            <p className="text-sm">No active trades</p>
            <p className="text-xs">Your portfolio risk is 0%</p>
          </div>
        )}

        {/* Risk Warning */}
        {portfolioRisk.exceedsLimit && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="w-5 h-5 text-red-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div className="ml-3">
                <h4 className="text-sm font-medium text-red-800">Risk Limit Exceeded</h4>
                <p className="text-sm text-red-700 mt-1">
                  Your portfolio risk exceeds the 6% limit. Consider closing some positions or reducing trade sizes.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};