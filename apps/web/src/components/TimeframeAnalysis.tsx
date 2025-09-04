import React from 'react';
import { 
  TimeframeType, 
  IndicatorType, 
  SignalType, 
  DivergenceType,
  CreateMethodAnalysisRequest 
} from '@trading-log/shared';

interface TimeframeAnalysisProps {
  timeframe: TimeframeType;
  analysis: Partial<CreateMethodAnalysisRequest>;
  onChange: (analysis: Partial<CreateMethodAnalysisRequest>) => void;
  disabled?: boolean;
}

const TimeframeAnalysis: React.FC<TimeframeAnalysisProps> = ({
  timeframe,
  analysis,
  onChange,
  disabled = false
}) => {
  const timeframeLabels = {
    [TimeframeType.DAILY]: 'Daily',
    [TimeframeType.WEEKLY]: 'Weekly',
    [TimeframeType.MONTHLY]: 'Monthly'
  };

  const indicatorOptions = [
    { value: IndicatorType.MACD, label: 'MACD' },
    { value: IndicatorType.RSI, label: 'RSI' },
    { value: IndicatorType.STOCHASTICS, label: 'Stochastics' },
    { value: IndicatorType.MOVING_AVERAGES, label: 'Moving Averages' },
    { value: IndicatorType.BOLLINGER_BANDS, label: 'Bollinger Bands' },
    { value: IndicatorType.VOLUME, label: 'Volume' },
    { value: IndicatorType.SUPPORT_RESISTANCE, label: 'Support/Resistance' },
    { value: IndicatorType.TRENDLINES, label: 'Trendlines' },
    { value: IndicatorType.FIBONACCI, label: 'Fibonacci' },
    { value: IndicatorType.OTHER, label: 'Other' }
  ];

  const signalOptions = [
    { value: SignalType.BUY_SIGNAL, label: 'Buy Signal' },
    { value: SignalType.SELL_SIGNAL, label: 'Sell Signal' },
    { value: SignalType.CONTINUATION, label: 'Continuation' },
    { value: SignalType.REVERSAL, label: 'Reversal' },
    { value: SignalType.BREAKOUT, label: 'Breakout' },
    { value: SignalType.BREAKDOWN, label: 'Breakdown' },
    { value: SignalType.OVERSOLD, label: 'Oversold' },
    { value: SignalType.OVERBOUGHT, label: 'Overbought' },
    { value: SignalType.NEUTRAL, label: 'Neutral' }
  ];

  const divergenceOptions = [
    { value: DivergenceType.BULLISH, label: 'Bullish Divergence', color: 'text-green-600', description: 'Price making lower lows while indicator makes higher lows' },
    { value: DivergenceType.BEARISH, label: 'Bearish Divergence', color: 'text-red-600', description: 'Price making higher highs while indicator makes lower highs' },
    { value: DivergenceType.NONE, label: 'No Divergence', color: 'text-gray-600', description: 'Price and indicator moving in sync' }
  ];

  const handleFieldChange = (field: keyof CreateMethodAnalysisRequest, value: any) => {
    onChange({
      ...analysis,
      timeframe,
      [field]: value
    });
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4 space-y-4">
      {/* Timeframe Header */}
      <div className="flex items-center justify-between">
        <h4 className="text-lg font-semibold text-gray-900">
          {timeframeLabels[timeframe]}
        </h4>
        <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
          {timeframe.replace('_', ' ')}
        </span>
      </div>

      {/* Indicator and Signal Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Indicator Selection */}
        <div className="space-y-2">
          <label htmlFor={`indicator-${timeframe}`} className="block text-sm font-medium text-gray-700">
            Indicator *
          </label>
          <select
            id={`indicator-${timeframe}`}
            value={analysis.indicator || ''}
            onChange={(e) => handleFieldChange('indicator', e.target.value as IndicatorType)}
            disabled={disabled}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
            required
          >
            <option value="">Select indicator...</option>
            {indicatorOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Signal Selection */}
        <div className="space-y-2">
          <label htmlFor={`signal-${timeframe}`} className="block text-sm font-medium text-gray-700">
            Signal *
          </label>
          <select
            id={`signal-${timeframe}`}
            value={analysis.signal || ''}
            onChange={(e) => handleFieldChange('signal', e.target.value as SignalType)}
            disabled={disabled}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
            required
          >
            <option value="">Select signal...</option>
            {signalOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Divergence Selection */}
      <div className="space-y-3">
        <span className="block text-sm font-medium text-gray-700">
          Divergence
        </span>
        <div className="flex flex-wrap gap-3">
          {divergenceOptions.map((option) => (
            <label key={option.value} className="flex items-start cursor-pointer group">
              <input
                type="radio"
                name={`divergence-${timeframe}`}
                value={option.value}
                checked={analysis.divergence === option.value}
                onChange={(e) => handleFieldChange('divergence', e.target.value as DivergenceType)}
                disabled={disabled}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 focus:ring-2 disabled:opacity-50 mt-0.5"
              />
              <div className="ml-2">
                <span className={`text-sm font-medium ${option.color}`}>
                  {option.label}
                </span>
                <p className="text-xs text-gray-500 mt-0.5 group-hover:text-gray-700 transition-colors">
                  {option.description}
                </p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Notes Field */}
      <div className="space-y-2">
        <label htmlFor={`notes-${timeframe}`} className="block text-sm font-medium text-gray-700">
          Notes
        </label>
        <textarea
          id={`notes-${timeframe}`}
          value={analysis.notes || ''}
          onChange={(e) => handleFieldChange('notes', e.target.value)}
          disabled={disabled}
          rows={2}
          placeholder={`Additional notes for ${timeframeLabels[timeframe]} analysis...`}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500 resize-none"
        />
      </div>
    </div>
  );
};

export default TimeframeAnalysis;