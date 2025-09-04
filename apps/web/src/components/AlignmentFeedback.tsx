import React from 'react';
import { AlignmentAnalysis } from '@trading-log/shared';
import AlignmentIndicator from './AlignmentIndicator';

interface AlignmentFeedbackProps {
  alignment: AlignmentAnalysis;
  onIgnoreWarning?: () => void;
  showRecommendations?: boolean;
  isSubmitting?: boolean;
}

const AlignmentFeedback: React.FC<AlignmentFeedbackProps> = ({
  alignment,
  onIgnoreWarning,
  showRecommendations = true,
  isSubmitting = false,
}) => {
  const hasStrongConflict = alignment.alignmentLevel === 'STRONG_CONFLICT';
  const hasWeakConflict = alignment.alignmentLevel === 'WEAK_CONFLICT';
  const hasAlignment = alignment.alignmentLevel === 'STRONG_ALIGNMENT' || 
                      alignment.alignmentLevel === 'WEAK_ALIGNMENT';

  const getRecommendations = (): string[] => {
    const recommendations: string[] = [];
    
    if (hasStrongConflict) {
      recommendations.push('Consider reviewing your analysis - multiple signals conflict with your trade direction');
      recommendations.push('Double-check divergence signals and ensure they align with your intended direction');
      recommendations.push('Review Dr. Elder\'s Method principles for signal confirmation');
    } else if (hasWeakConflict) {
      recommendations.push('Some signals show mild conflict - consider waiting for stronger confirmation');
      recommendations.push('Review conflicting timeframes for potential resolution');
    } else if (alignment.alignmentLevel === 'NEUTRAL') {
      recommendations.push('Signals are mixed - consider waiting for clearer directional bias');
      recommendations.push('Look for additional confirmation before entering this trade');
    } else if (alignment.alignmentLevel === 'WEAK_ALIGNMENT') {
      recommendations.push('Signals show weak alignment - consider position sizing adjustment');
      recommendations.push('Monitor for strengthening signals before full position entry');
    } else if (alignment.alignmentLevel === 'STRONG_ALIGNMENT') {
      recommendations.push('Excellent signal alignment! This setup follows proper Method principles');
      recommendations.push('Consider this high-probability setup for standard position sizing');
    }

    return recommendations;
  };

  const getActionMessage = (): { message: string; severity: 'error' | 'warning' | 'success' | 'info' } => {
    if (hasStrongConflict) {
      return {
        message: 'Strong signal conflict detected. Consider reviewing your analysis before proceeding.',
        severity: 'error'
      };
    } else if (hasWeakConflict) {
      return {
        message: 'Some signals conflict with your trade direction. Proceed with caution.',
        severity: 'warning'
      };
    } else if (alignment.alignmentLevel === 'NEUTRAL') {
      return {
        message: 'Signals are mixed. Consider waiting for clearer directional bias.',
        severity: 'info'
      };
    } else if (hasAlignment) {
      return {
        message: 'Great signal alignment! This setup follows sound technical analysis principles.',
        severity: 'success'
      };
    } else {
      return {
        message: 'Review your method analysis for optimal trade setup.',
        severity: 'info'
      };
    }
  };

  const actionMessage = getActionMessage();
  const recommendations = showRecommendations ? getRecommendations() : [];

  const getMessageColors = (severity: string): string => {
    switch (severity) {
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'warning':
        return 'bg-orange-50 border-orange-200 text-orange-800';
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'info':
      default:
        return 'bg-blue-50 border-blue-200 text-blue-800';
    }
  };

  const getMessageIcon = (severity: string): string => {
    switch (severity) {
      case 'error':
        return '🛑';
      case 'warning':
        return '⚠️';
      case 'success':
        return '✅';
      case 'info':
      default:
        return 'ℹ️';
    }
  };

  return (
    <div className="space-y-4">
      {/* Main Alignment Display */}
      <AlignmentIndicator 
        alignmentAnalysis={alignment} 
        showDetails={true} 
        compact={false} 
      />

      {/* Action Message */}
      <div className={`p-4 rounded-lg border ${getMessageColors(actionMessage.severity)}`}>
        <div className="flex items-start space-x-3">
          <span className="text-lg flex-shrink-0 mt-0.5">
            {getMessageIcon(actionMessage.severity)}
          </span>
          <div className="flex-1">
            <p className="font-medium text-sm">{actionMessage.message}</p>
            
            {/* Warning Override Button */}
            {hasStrongConflict && onIgnoreWarning && (
              <button
                onClick={onIgnoreWarning}
                disabled={isSubmitting}
                className="mt-2 text-sm underline hover:no-underline disabled:opacity-50"
              >
                Proceed anyway (I understand the risks)
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h4 className="font-medium text-gray-800 text-sm mb-3">💡 Recommendations</h4>
          <ul className="space-y-2">
            {recommendations.map((recommendation, index) => (
              <li key={index} className="text-sm text-gray-700 flex items-start">
                <span className="inline-block w-1.5 h-1.5 bg-blue-400 rounded-full mt-2 mr-3 flex-shrink-0" />
                {recommendation}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Educational Content */}
      {(hasStrongConflict || hasWeakConflict) && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <h4 className="font-medium text-purple-800 text-sm mb-2">📚 Trading Education</h4>
          <p className="text-sm text-purple-700 mb-2">
            Remember Dr. Elder's "Method" principle: all signals should align with your trade direction across multiple timeframes.
          </p>
          <div className="text-xs text-purple-600">
            <strong>Tip:</strong> Conflicting signals often indicate market indecision. 
            Consider waiting for clearer confirmation or reducing position size.
          </div>
        </div>
      )}

      {/* Performance Insight (if available) */}
      {hasAlignment && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h4 className="font-medium text-green-800 text-sm mb-2">📈 Performance Insight</h4>
          <p className="text-sm text-green-700">
            Historically, trades with {alignment.alignmentLevel.toLowerCase().replace('_', ' ')} 
            tend to perform better than conflicted setups. This setup shows good adherence to 
            systematic trading principles.
          </p>
        </div>
      )}
    </div>
  );
};

export default AlignmentFeedback;