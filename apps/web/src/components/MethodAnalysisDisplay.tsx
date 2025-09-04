import React from 'react';
import { 
  MethodAnalysis, 
  TimeframeType, 
  IndicatorType, 
  SignalType, 
  DivergenceType 
} from '@trading-log/shared';

interface MethodAnalysisDisplayProps {
  analysis: MethodAnalysis[];
  compact?: boolean;
}

const MethodAnalysisDisplay: React.FC<MethodAnalysisDisplayProps> = ({ 
  analysis, 
  compact = false 
}) => {
  if (!analysis || analysis.length === 0) {
    return (
      <div className="text-sm text-gray-500 italic">
        No method analysis recorded
      </div>
    );
  }

  const timeframeLabels = {
    [TimeframeType.DAILY]: 'Daily',
    [TimeframeType.WEEKLY]: 'Weekly', 
    [TimeframeType.MONTHLY]: 'Monthly'
  };

  const getIndicatorBadge = (indicator: IndicatorType) => {
    const colors = {
      [IndicatorType.MACD]: 'bg-blue-100 text-blue-800',
      [IndicatorType.RSI]: 'bg-purple-100 text-purple-800',
      [IndicatorType.STOCHASTICS]: 'bg-indigo-100 text-indigo-800',
      [IndicatorType.MOVING_AVERAGES]: 'bg-green-100 text-green-800',
      [IndicatorType.BOLLINGER_BANDS]: 'bg-yellow-100 text-yellow-800',
      [IndicatorType.VOLUME]: 'bg-orange-100 text-orange-800',
      [IndicatorType.SUPPORT_RESISTANCE]: 'bg-red-100 text-red-800',
      [IndicatorType.TRENDLINES]: 'bg-pink-100 text-pink-800',
      [IndicatorType.FIBONACCI]: 'bg-cyan-100 text-cyan-800',
      [IndicatorType.OTHER]: 'bg-gray-100 text-gray-800'
    };

    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colors[indicator]}`}>
        {indicator.replace('_', ' ')}
      </span>
    );
  };

  const getSignalBadge = (signal: SignalType) => {
    const colors = {
      [SignalType.BUY_SIGNAL]: 'bg-green-100 text-green-800',
      [SignalType.SELL_SIGNAL]: 'bg-red-100 text-red-800',
      [SignalType.CONTINUATION]: 'bg-blue-100 text-blue-800',
      [SignalType.REVERSAL]: 'bg-purple-100 text-purple-800',
      [SignalType.BREAKOUT]: 'bg-emerald-100 text-emerald-800',
      [SignalType.BREAKDOWN]: 'bg-rose-100 text-rose-800',
      [SignalType.OVERSOLD]: 'bg-cyan-100 text-cyan-800',
      [SignalType.OVERBOUGHT]: 'bg-amber-100 text-amber-800',
      [SignalType.NEUTRAL]: 'bg-gray-100 text-gray-800'
    };

    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colors[signal]}`}>
        {signal.replace('_', ' ')}
      </span>
    );
  };

  const getDivergenceIndicator = (divergence: DivergenceType) => {
    if (divergence === DivergenceType.NONE) return null;

    const config = {
      [DivergenceType.BULLISH]: {
        icon: '↗',
        color: 'text-green-600',
        bg: 'bg-green-50',
        label: 'Bullish Divergence'
      },
      [DivergenceType.BEARISH]: {
        icon: '↘',
        color: 'text-red-600', 
        bg: 'bg-red-50',
        label: 'Bearish Divergence'
      }
    };

    const div = config[divergence as keyof typeof config];
    if (!div) return null;

    return (
      <div className={`inline-flex items-center px-2 py-1 rounded-md ${div.bg} ${div.color}`}>
        <span className="text-sm font-medium mr-1">{div.icon}</span>
        <span className="text-xs font-medium">{compact ? 'Div' : div.label}</span>
      </div>
    );
  };

  // Sort analysis by timeframe order
  const sortedAnalysis = [...analysis].sort((a, b) => {
    const order = [TimeframeType.MONTHLY, TimeframeType.WEEKLY, TimeframeType.DAILY];
    return order.indexOf(a.timeframe) - order.indexOf(b.timeframe);
  });

  if (compact) {
    return (
      <div className="space-y-2">
        {sortedAnalysis.map((item) => (
          <div key={`${item.tradeId}-${item.timeframe}`} className="flex items-center space-x-2 text-sm">
            <span className="font-medium text-gray-700 min-w-[50px]">
              {timeframeLabels[item.timeframe]}:
            </span>
            <div className="flex items-center space-x-1">
              {getIndicatorBadge(item.indicator)}
              <span className="text-gray-400">•</span>
              {getSignalBadge(item.signal)}
              {getDivergenceIndicator(item.divergence)}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-900">Method Analysis</h4>
        <div className="flex items-center space-x-2 text-xs text-gray-500">
          <div className="flex items-center space-x-1">
            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
            <span>Bullish</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="w-2 h-2 bg-red-500 rounded-full"></span>
            <span>Bearish</span>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {sortedAnalysis.map((item) => (
          <div 
            key={`${item.tradeId}-${item.timeframe}`}
            className="border border-gray-200 rounded-lg p-3 bg-gray-50"
          >
            {/* Timeframe Header */}
            <div className="flex items-center justify-between mb-2">
              <h5 className="font-medium text-gray-900">
                {timeframeLabels[item.timeframe]}
              </h5>
              <span className="text-xs text-gray-500">
                {new Date(item.createdAt).toLocaleDateString()}
              </span>
            </div>

            {/* Indicator and Signal */}
            <div className="flex flex-wrap items-center gap-2 mb-2">
              {getIndicatorBadge(item.indicator)}
              {getSignalBadge(item.signal)}
              {getDivergenceIndicator(item.divergence)}
            </div>

            {/* Notes */}
            {item.notes && (
              <div className="mt-2 pt-2 border-t border-gray-200">
                <p className="text-sm text-gray-600 italic">
                  "{item.notes}"
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default MethodAnalysisDisplay;