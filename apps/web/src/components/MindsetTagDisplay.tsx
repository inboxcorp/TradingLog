import React from 'react';
import { MindsetTag, MindsetTagType, IntensityLevel, getMindsetTagStyle } from '@trading-log/shared';

interface MindsetTagDisplayProps {
  tags: MindsetTag[];
  showIntensity?: boolean;
  compact?: boolean;
  onClick?: (tag: MindsetTag) => void;
}

const mindsetTagLabels: Record<MindsetTagType, string> = {
  [MindsetTagType.DISCIPLINED]: 'Disciplined',
  [MindsetTagType.PATIENT]: 'Patient',
  [MindsetTagType.CONFIDENT]: 'Confident',
  [MindsetTagType.FOCUSED]: 'Focused',
  [MindsetTagType.CALM]: 'Calm',
  [MindsetTagType.ANALYTICAL]: 'Analytical',
  [MindsetTagType.ANXIOUS]: 'Anxious',
  [MindsetTagType.FOMO]: 'FOMO',
  [MindsetTagType.GREEDY]: 'Greedy',
  [MindsetTagType.FEARFUL]: 'Fearful',
  [MindsetTagType.IMPULSIVE]: 'Impulsive',
  [MindsetTagType.REVENGE_TRADING]: 'Revenge Trading',
  [MindsetTagType.OVERCONFIDENT]: 'Overconfident',
  [MindsetTagType.NEUTRAL]: 'Neutral',
  [MindsetTagType.UNCERTAIN]: 'Uncertain',
  [MindsetTagType.TIRED]: 'Tired',
  [MindsetTagType.DISTRACTED]: 'Distracted',
};

const intensityLabels: Record<IntensityLevel, string> = {
  [IntensityLevel.LOW]: 'Low',
  [IntensityLevel.MEDIUM]: 'Med',
  [IntensityLevel.HIGH]: 'High',
};

const intensitySymbols: Record<IntensityLevel, string> = {
  [IntensityLevel.LOW]: '•',
  [IntensityLevel.MEDIUM]: '••',
  [IntensityLevel.HIGH]: '•••',
};

export const MindsetTagDisplay: React.FC<MindsetTagDisplayProps> = ({ 
  tags, 
  showIntensity = true, 
  compact = false, 
  onClick 
}) => {
  if (!tags || tags.length === 0) {
    return compact ? null : (
      <div className="text-sm text-gray-500 italic">
        No mindset tags recorded
      </div>
    );
  }

  // Group tags by category for better display
  const groupedTags = tags.reduce((acc, tag) => {
    const style = getMindsetTagStyle(tag.tag);
    const category = style.category;
    
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(tag);
    return acc;
  }, {} as Record<string, MindsetTag[]>);

  const categoryOrder = ['positive', 'neutral', 'negative'];
  const categoryLabels = {
    positive: 'Positive',
    neutral: 'Neutral', 
    negative: 'Negative'
  };

  if (compact) {
    return (
      <div className="flex flex-wrap gap-1">
        {tags.map((tag) => {
          const style = getMindsetTagStyle(tag.tag);
          const label = mindsetTagLabels[tag.tag];
          
          return (
            <span
              key={tag.id}
              onClick={() => onClick?.(tag)}
              className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full border ${
                onClick ? 'cursor-pointer hover:opacity-80' : ''
              }`}
              style={{ 
                backgroundColor: `${style.backgroundColor}20`,
                borderColor: style.backgroundColor,
                color: style.backgroundColor
              }}
              title={showIntensity ? `${label} (${intensityLabels[tag.intensity]})` : label}
            >
              <span className="truncate max-w-20">{label}</span>
              {showIntensity && (
                <span className="ml-1 opacity-70">
                  {intensitySymbols[tag.intensity]}
                </span>
              )}
            </span>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {categoryOrder.map((category) => {
        const categoryTags = groupedTags[category];
        if (!categoryTags || categoryTags.length === 0) return null;

        return (
          <div key={category} className="space-y-2">
            <h4 className="text-sm font-medium text-gray-700 flex items-center space-x-2">
              <span>{categoryLabels[category as keyof typeof categoryLabels]}</span>
              <span className="text-xs text-gray-500">({categoryTags.length})</span>
            </h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {categoryTags.map((tag) => {
                const style = getMindsetTagStyle(tag.tag);
                const label = mindsetTagLabels[tag.tag];
                
                return (
                  <div
                    key={tag.id}
                    onClick={() => onClick?.(tag)}
                    className={`flex items-center justify-between p-3 rounded-lg border-2 ${
                      onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''
                    }`}
                    style={{ 
                      backgroundColor: `${style.backgroundColor}10`,
                      borderColor: `${style.backgroundColor}40`
                    }}
                  >
                    <div className="flex items-center space-x-3">
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: style.backgroundColor }}
                      />
                      <span className="text-sm font-medium text-gray-900">{label}</span>
                    </div>
                    
                    {showIntensity && (
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-gray-600">
                          {intensityLabels[tag.intensity]}
                        </span>
                        <div className="flex space-x-1">
                          {[IntensityLevel.LOW, IntensityLevel.MEDIUM, IntensityLevel.HIGH].map((level, index) => (
                            <div
                              key={level}
                              className="w-2 h-2 rounded-full"
                              style={{ 
                                backgroundColor: index < Object.values(IntensityLevel).indexOf(tag.intensity) + 1 
                                  ? style.backgroundColor 
                                  : '#e5e7eb'
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
      
      {/* Summary */}
      <div className="border-t border-gray-200 pt-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Total mindset tags:</span>
          <span className="font-medium text-gray-900">{tags.length}</span>
        </div>
      </div>
    </div>
  );
};

export default MindsetTagDisplay;