import React from 'react';
import { AlignmentAnalysis, AlignmentLevel } from '@trading-log/shared';

interface AlignmentIndicatorProps {
  alignmentAnalysis?: AlignmentAnalysis;
  showDetails?: boolean;
  compact?: boolean;
}

const AlignmentIndicator: React.FC<AlignmentIndicatorProps> = ({ 
  alignmentAnalysis, 
  showDetails = false, 
  compact = false 
}) => {
  if (!alignmentAnalysis) {
    return (
      <div className="text-sm text-gray-500">
        No alignment analysis available
      </div>
    );
  }

  const getAlignmentColor = (level: AlignmentLevel): string => {
    switch (level) {
      case 'STRONG_ALIGNMENT':
        return 'text-green-700 bg-green-50 border-green-200';
      case 'WEAK_ALIGNMENT':
        return 'text-green-600 bg-green-50 border-green-100';
      case 'NEUTRAL':
        return 'text-gray-600 bg-gray-50 border-gray-200';
      case 'WEAK_CONFLICT':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'STRONG_CONFLICT':
        return 'text-red-700 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getAlignmentIcon = (level: AlignmentLevel): string => {
    switch (level) {
      case 'STRONG_ALIGNMENT':
        return '✅';
      case 'WEAK_ALIGNMENT':
        return '🟢';
      case 'NEUTRAL':
        return '⚪';
      case 'WEAK_CONFLICT':
        return '🟡';
      case 'STRONG_CONFLICT':
        return '🔴';
      default:
        return '⚪';
    }
  };

  const getAlignmentText = (level: AlignmentLevel): string => {
    switch (level) {
      case 'STRONG_ALIGNMENT':
        return 'Strong Alignment';
      case 'WEAK_ALIGNMENT':
        return 'Weak Alignment';
      case 'NEUTRAL':
        return 'Neutral';
      case 'WEAK_CONFLICT':
        return 'Weak Conflict';
      case 'STRONG_CONFLICT':
        return 'Strong Conflict';
      default:
        return 'Unknown';
    }
  };

  const formatScore = (score: number): string => {
    return (score * 100).toFixed(0);
  };

  const colorClass = getAlignmentColor(alignmentAnalysis.alignmentLevel);
  const icon = getAlignmentIcon(alignmentAnalysis.alignmentLevel);
  const text = getAlignmentText(alignmentAnalysis.alignmentLevel);

  if (compact) {
    return (
      <div className={`inline-flex items-center px-2 py-1 text-xs rounded-md border ${colorClass}`}>
        <span className="mr-1">{icon}</span>
        <span className="font-medium">{text}</span>
        <span className="ml-1">({formatScore(alignmentAnalysis.overallScore)}%)</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Main Alignment Display */}
      <div className={`p-4 rounded-lg border ${colorClass}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-lg">{icon}</span>
            <h3 className="font-semibold text-sm">{text}</h3>
          </div>
          <div className="text-right">
            <div className="font-mono text-lg font-bold">
              {formatScore(alignmentAnalysis.overallScore)}%
            </div>
            <div className="text-xs opacity-70">Overall Score</div>
          </div>
        </div>

        {/* Score Visualization */}
        <div className="mt-3">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${
                alignmentAnalysis.overallScore >= 0 ? 'bg-green-500' : 'bg-red-500'
              }`}
              style={{
                width: `${Math.max(5, Math.abs(alignmentAnalysis.overallScore) * 100)}%`,
              }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>-100%</span>
            <span>0%</span>
            <span>+100%</span>
          </div>
        </div>
      </div>

      {/* Warnings and Confirmations */}
      {showDetails && (
        <div className="space-y-2">
          {alignmentAnalysis.warnings.length > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
              <h4 className="font-medium text-orange-800 text-sm mb-2">⚠️ Warnings</h4>
              <ul className="space-y-1">
                {alignmentAnalysis.warnings.map((warning, index) => (
                  <li key={index} className="text-sm text-orange-700 flex items-start">
                    <span className="inline-block w-1 h-1 bg-orange-400 rounded-full mt-2 mr-2 flex-shrink-0" />
                    {warning}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {alignmentAnalysis.confirmations.length > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <h4 className="font-medium text-green-800 text-sm mb-2">✅ Confirmations</h4>
              <ul className="space-y-1">
                {alignmentAnalysis.confirmations.map((confirmation, index) => (
                  <li key={index} className="text-sm text-green-700 flex items-start">
                    <span className="inline-block w-1 h-1 bg-green-400 rounded-full mt-2 mr-2 flex-shrink-0" />
                    {confirmation}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Timeframe Breakdown */}
      {showDetails && alignmentAnalysis.timeframeBreakdown.length > 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
          <h4 className="font-medium text-gray-800 text-sm mb-3">📊 Timeframe Breakdown</h4>
          <div className="space-y-2">
            {alignmentAnalysis.timeframeBreakdown.map((breakdown, index) => (
              <div key={index} className="flex items-center justify-between py-2 px-3 bg-white rounded border">
                <div className="flex items-center space-x-3">
                  <span className="font-medium text-sm text-gray-700">
                    {breakdown.timeframe}
                  </span>
                  <span className="text-xs text-gray-500">
                    {breakdown.analysis.indicator} - {breakdown.analysis.signal}
                  </span>
                  {breakdown.analysis.divergence !== 'NONE' && (
                    <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded">
                      {breakdown.analysis.divergence} DIV
                    </span>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <span
                    className={`text-xs px-2 py-1 rounded font-medium ${
                      breakdown.alignment === 'ALIGNED'
                        ? 'bg-green-100 text-green-700'
                        : breakdown.alignment === 'CONFLICTED'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {breakdown.alignment}
                  </span>
                  <span className="font-mono text-sm font-medium">
                    {formatScore(breakdown.score)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AlignmentIndicator;