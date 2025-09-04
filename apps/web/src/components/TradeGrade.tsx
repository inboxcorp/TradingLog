import React, { useState } from 'react';
import { TradeGrade as TradeGradeType, GradeLevel, GRADE_COLORS } from '@trading-log/shared';

interface TradeGradeProps {
  grade: TradeGradeType;
  showBreakdown?: boolean;
  compact?: boolean;
  interactive?: boolean;
}

interface GradeBadgeProps {
  grade: GradeLevel;
  score?: number;
  size?: 'sm' | 'md' | 'lg';
  showScore?: boolean;
}

const GradeBadge: React.FC<GradeBadgeProps> = ({ 
  grade, 
  score, 
  size = 'md', 
  showScore = false 
}) => {
  const color = GRADE_COLORS[grade];
  
  const sizeClasses = {
    sm: 'h-6 w-6 text-xs',
    md: 'h-8 w-8 text-sm',
    lg: 'h-12 w-12 text-lg'
  };
  
  const textSizeClasses = {
    sm: 'text-[10px]',
    md: 'text-xs',
    lg: 'text-sm'
  };

  return (
    <div className="flex items-center gap-2">
      <div
        className={`${sizeClasses[size]} rounded-full flex items-center justify-center font-bold text-white shadow-sm`}
        style={{ backgroundColor: color }}
        title={`Grade: ${grade}${score ? ` (${score.toFixed(1)}/100)` : ''}`}
      >
        <span className={textSizeClasses[size]}>{grade}</span>
      </div>
      {showScore && score && (
        <span className="text-sm text-gray-600 font-medium">
          {score.toFixed(1)}
        </span>
      )}
    </div>
  );
};

interface GradeBreakdownProps {
  grade: TradeGradeType;
  compact?: boolean;
}

const GradeBreakdown: React.FC<GradeBreakdownProps> = ({ grade, compact = false }) => {
  const components = [
    {
      name: 'Risk Management',
      key: 'riskManagement',
      data: grade.breakdown.riskManagement,
      color: 'bg-blue-500'
    },
    {
      name: 'Method Alignment',
      key: 'methodAlignment',
      data: grade.breakdown.methodAlignment,
      color: 'bg-green-500'
    },
    {
      name: 'Mindset Quality',
      key: 'mindsetQuality',
      data: grade.breakdown.mindsetQuality,
      color: 'bg-purple-500'
    },
    {
      name: 'Execution',
      key: 'execution',
      data: grade.breakdown.execution,
      color: 'bg-orange-500'
    }
  ];

  if (compact) {
    return (
      <div className="space-y-2">
        {components.map((component) => (
          <div key={component.key} className="flex items-center justify-between">
            <span className="text-sm text-gray-700">{component.name}</span>
            <div className="flex items-center gap-2">
              <div className="w-12 bg-gray-200 rounded-full h-2">
                <div
                  className={`${component.color} h-2 rounded-full transition-all duration-300`}
                  style={{ width: `${component.data.score}%` }}
                />
              </div>
              <span className="text-sm font-medium text-gray-800 w-8">
                {component.data.score.toFixed(0)}
              </span>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {components.map((component) => (
        <div key={component.key} className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium text-gray-900">{component.name}</h4>
            <span className="text-sm font-semibold text-gray-800">
              {component.data.score.toFixed(1)}/100
            </span>
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-3 mb-3">
            <div
              className={`${component.color} h-3 rounded-full transition-all duration-500`}
              style={{ width: `${component.data.score}%` }}
            />
          </div>
          
          {component.data.factors.length > 0 && (
            <div className="mb-2">
              <h5 className="text-sm font-medium text-green-800 mb-1">Strengths:</h5>
              <ul className="text-sm text-green-700 space-y-1">
                {component.data.factors.map((factor, index) => (
                  <li key={index} className="flex items-start gap-1">
                    <span className="text-green-500">•</span>
                    {factor}
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {component.data.improvements.length > 0 && (
            <div>
              <h5 className="text-sm font-medium text-red-800 mb-1">Improvements:</h5>
              <ul className="text-sm text-red-700 space-y-1">
                {component.data.improvements.map((improvement, index) => (
                  <li key={index} className="flex items-start gap-1">
                    <span className="text-red-500">•</span>
                    {improvement}
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

const TradeGrade: React.FC<TradeGradeProps> = ({ 
  grade, 
  showBreakdown = false, 
  compact = false,
  interactive = true 
}) => {
  const [isExpanded, setIsExpanded] = useState(showBreakdown);
  const [showTooltip, setShowTooltip] = useState(false);

  const handleToggle = () => {
    if (interactive) {
      setIsExpanded(!isExpanded);
    }
  };

  // const overallColor = GRADE_COLORS[grade.overall]; // Removed unused variable

  return (
    <div className="trade-grade">
      <div 
        className={`flex items-center gap-3 ${interactive ? 'cursor-pointer hover:bg-gray-50' : ''} ${compact ? 'p-2' : 'p-3'} rounded-lg transition-colors`}
        onClick={handleToggle}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <GradeBadge 
          grade={grade.overall} 
          score={grade.score} 
          size={compact ? 'sm' : 'md'}
          showScore={!compact}
        />
        
        {!compact && (
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">
                Trade Grade: {grade.overall}
              </h3>
              {interactive && (
                <button
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label={isExpanded ? 'Collapse details' : 'Expand details'}
                >
                  <svg
                    className={`w-4 h-4 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              )}
            </div>
            <p className="text-sm text-gray-600">
              Overall Score: {grade.score.toFixed(1)}/100
            </p>
            
            {/* Quick component scores bar */}
            <div className="flex items-center gap-1 mt-2">
              <div className="flex-1 bg-gray-200 rounded-full h-2 flex overflow-hidden">
                <div
                  className="bg-blue-500 transition-all duration-300"
                  style={{ width: `${grade.breakdown.riskManagement.score * grade.breakdown.riskManagement.weight}%` }}
                  title={`Risk Management: ${grade.breakdown.riskManagement.score.toFixed(1)}`}
                />
                <div
                  className="bg-green-500 transition-all duration-300"
                  style={{ width: `${grade.breakdown.methodAlignment.score * grade.breakdown.methodAlignment.weight}%` }}
                  title={`Method Alignment: ${grade.breakdown.methodAlignment.score.toFixed(1)}`}
                />
                <div
                  className="bg-purple-500 transition-all duration-300"
                  style={{ width: `${grade.breakdown.mindsetQuality.score * grade.breakdown.mindsetQuality.weight}%` }}
                  title={`Mindset Quality: ${grade.breakdown.mindsetQuality.score.toFixed(1)}`}
                />
                <div
                  className="bg-orange-500 transition-all duration-300"
                  style={{ width: `${grade.breakdown.execution.score * grade.breakdown.execution.weight}%` }}
                  title={`Execution: ${grade.breakdown.execution.score.toFixed(1)}`}
                />
              </div>
            </div>
          </div>
        )}
        
        {/* Tooltip */}
        {showTooltip && compact && (
          <div className="absolute z-10 bg-black text-white text-xs rounded py-2 px-3 bottom-full left-1/2 transform -translate-x-1/2 mb-2 whitespace-nowrap">
            Grade: {grade.overall} ({grade.score.toFixed(1)}/100)
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-black"></div>
          </div>
        )}
      </div>

      {/* Expanded breakdown */}
      {isExpanded && (
        <div className="border-t border-gray-200 mt-3 pt-4">
          <GradeBreakdown grade={grade} compact={compact} />
          
          {/* Explanation */}
          {grade.explanation && grade.explanation.length > 0 && (
            <div className="mt-4 bg-blue-50 rounded-lg p-3">
              <h4 className="font-medium text-blue-900 mb-2">Grade Explanation</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                {grade.explanation.map((explanation, index) => (
                  <li key={index} className="flex items-start gap-1">
                    <span className="text-blue-500">•</span>
                    {explanation}
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {/* Recommendations */}
          {grade.recommendations && grade.recommendations.length > 0 && (
            <div className="mt-4 bg-yellow-50 rounded-lg p-3">
              <h4 className="font-medium text-yellow-900 mb-2">Improvement Recommendations</h4>
              <ul className="text-sm text-yellow-800 space-y-1">
                {grade.recommendations.map((recommendation, index) => (
                  <li key={index} className="flex items-start gap-1">
                    <span className="text-yellow-600">→</span>
                    {recommendation}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export { GradeBadge };
export default TradeGrade;