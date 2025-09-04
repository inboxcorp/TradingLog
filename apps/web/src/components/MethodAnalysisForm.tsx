import React, { useState, useCallback } from 'react';
import { 
  MethodAnalysis,
  TimeframeType, 
  DivergenceType,
  CreateMethodAnalysisRequest,
  validateMethodAnalysis
} from '@trading-log/shared';
import TimeframeAnalysis from './TimeframeAnalysis';

interface MethodAnalysisFormProps {
  initialAnalysis?: MethodAnalysis[];
  onAnalysisChange: (analysis: CreateMethodAnalysisRequest[]) => void;
  disabled?: boolean;
}

const MethodAnalysisForm: React.FC<MethodAnalysisFormProps> = ({
  initialAnalysis = [],
  onAnalysisChange,
  disabled = false
}) => {
  const timeframes = [
    TimeframeType.DAILY,
    TimeframeType.WEEKLY,
    TimeframeType.MONTHLY
  ];

  // Initialize analysis state
  const [analysisData, setAnalysisData] = useState<Record<TimeframeType, Partial<CreateMethodAnalysisRequest>>>(() => {
    const initial: Record<TimeframeType, Partial<CreateMethodAnalysisRequest>> = {
      [TimeframeType.DAILY]: { timeframe: TimeframeType.DAILY, divergence: DivergenceType.NONE },
      [TimeframeType.WEEKLY]: { timeframe: TimeframeType.WEEKLY, divergence: DivergenceType.NONE },
      [TimeframeType.MONTHLY]: { timeframe: TimeframeType.MONTHLY, divergence: DivergenceType.NONE }
    };

    // Populate with existing analysis if available
    initialAnalysis.forEach(analysis => {
      if (analysis.timeframe in initial) {
        initial[analysis.timeframe] = {
          timeframe: analysis.timeframe,
          indicator: analysis.indicator,
          signal: analysis.signal,
          divergence: analysis.divergence,
          notes: analysis.notes || undefined
        };
      }
    });

    return initial;
  });

  const [validationError, setValidationError] = useState<string | null>(null);

  // Update analysis for specific timeframe
  const handleTimeframeChange = useCallback((timeframe: TimeframeType, analysis: Partial<CreateMethodAnalysisRequest>) => {
    const updatedAnalysis = {
      ...analysisData,
      [timeframe]: analysis
    };
    
    setAnalysisData(updatedAnalysis);

    // Convert to array and filter out incomplete entries
    const analysisArray = timeframes
      .map(tf => updatedAnalysis[tf])
      .filter((analysis): analysis is CreateMethodAnalysisRequest => {
        return !!(analysis.indicator && analysis.signal && analysis.timeframe);
      });

    // Validate the analysis array
    if (analysisArray.length > 0) {
      const validation = validateMethodAnalysis(analysisArray);
      if (!validation.isValid) {
        setValidationError(validation.error || 'Invalid analysis configuration');
        return;
      }
    }
    
    setValidationError(null);
    onAnalysisChange(analysisArray);
  }, [analysisData, onAnalysisChange, timeframes]);

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Method Analysis
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Document the technical indicators, signals, and divergences used in your analysis.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          <span className="text-xs text-gray-500">Bullish</span>
          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
          <span className="text-xs text-gray-500">Bearish</span>
          <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
          <span className="text-xs text-gray-500">None</span>
        </div>
      </div>

      {/* Validation Error */}
      {validationError && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-800">{validationError}</p>
            </div>
          </div>
        </div>
      )}

      {/* Progressive Disclosure Toggle */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-blue-700">
              <strong>Optional:</strong> Complete analysis for the timeframes you used in your trading decision. 
              At least one timeframe should have both an indicator and signal selected to save your analysis.
            </p>
          </div>
        </div>
      </div>

      {/* Timeframe Analysis Sections */}
      <div className="space-y-6">
        {timeframes.map((timeframe) => (
          <TimeframeAnalysis
            key={timeframe}
            timeframe={timeframe}
            analysis={analysisData[timeframe]}
            onChange={(analysis) => handleTimeframeChange(timeframe, analysis)}
            disabled={disabled}
          />
        ))}
      </div>

      {/* Summary */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-900 mb-2">Analysis Summary</h4>
        <div className="space-y-1">
          {timeframes.map((timeframe) => {
            const analysis = analysisData[timeframe];
            const hasCompleteAnalysis = analysis.indicator && analysis.signal;
            
            return (
              <div key={timeframe} className="flex items-center justify-between text-xs">
                <span className="text-gray-600">
                  {timeframe.replace('_', ' ')}:
                </span>
                <span className={hasCompleteAnalysis ? 'text-green-600 font-medium' : 'text-gray-400'}>
                  {hasCompleteAnalysis 
                    ? `${analysis.indicator} • ${analysis.signal}${analysis.divergence !== DivergenceType.NONE ? ` • ${analysis.divergence}` : ''}`
                    : 'Not configured'
                  }
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default MethodAnalysisForm;