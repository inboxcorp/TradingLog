import React, { useState, useMemo } from 'react';
import { MindsetTagType, IntensityLevel, getMindsetTagStyle } from '@trading-log/shared';

interface MindsetTagSelectorProps {
  selectedTags: Array<{ tag: MindsetTagType; intensity: IntensityLevel }>;
  onTagsChange: (tags: Array<{ tag: MindsetTagType; intensity: IntensityLevel }>) => void;
  maxSelections?: number;
  disabled?: boolean;
}

const mindsetTagOptions = [
  // Positive States
  { tag: MindsetTagType.DISCIPLINED, label: 'Disciplined', description: 'Following your trading plan with precision' },
  { tag: MindsetTagType.PATIENT, label: 'Patient', description: 'Waiting for the right setup before entering' },
  { tag: MindsetTagType.CONFIDENT, label: 'Confident', description: 'Strong conviction in your analysis' },
  { tag: MindsetTagType.FOCUSED, label: 'Focused', description: 'Concentrated and alert to market conditions' },
  { tag: MindsetTagType.CALM, label: 'Calm', description: 'Emotionally balanced and clear-headed' },
  { tag: MindsetTagType.ANALYTICAL, label: 'Analytical', description: 'Objective and data-driven approach' },
  
  // Negative States  
  { tag: MindsetTagType.ANXIOUS, label: 'Anxious', description: 'Feeling nervous or worried about the trade' },
  { tag: MindsetTagType.FOMO, label: 'FOMO', description: 'Fear of missing out driving the decision' },
  { tag: MindsetTagType.GREEDY, label: 'Greedy', description: 'Excessive desire for profits' },
  { tag: MindsetTagType.FEARFUL, label: 'Fearful', description: 'Scared of potential losses' },
  { tag: MindsetTagType.IMPULSIVE, label: 'Impulsive', description: 'Acting without proper analysis' },
  { tag: MindsetTagType.REVENGE_TRADING, label: 'Revenge Trading', description: 'Trading to recover from previous losses' },
  { tag: MindsetTagType.OVERCONFIDENT, label: 'Overconfident', description: 'Excessive confidence leading to poor risk management' },
  
  // Neutral States
  { tag: MindsetTagType.NEUTRAL, label: 'Neutral', description: 'Balanced emotional state' },
  { tag: MindsetTagType.UNCERTAIN, label: 'Uncertain', description: 'Unsure about the trade but proceeding anyway' },
  { tag: MindsetTagType.TIRED, label: 'Tired', description: 'Mentally or physically fatigued' },
  { tag: MindsetTagType.DISTRACTED, label: 'Distracted', description: 'Not fully focused on the market' },
];

const intensityLabels = {
  [IntensityLevel.LOW]: 'Low',
  [IntensityLevel.MEDIUM]: 'Medium',
  [IntensityLevel.HIGH]: 'High',
};

export const MindsetTagSelector: React.FC<MindsetTagSelectorProps> = ({ 
  selectedTags, 
  onTagsChange, 
  maxSelections = 5, 
  disabled = false 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'positive' | 'negative' | 'neutral'>('all');

  // Filter options based on search and category
  const filteredOptions = useMemo(() => {
    let filtered = mindsetTagOptions;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(option => 
        option.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        option.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(option => {
        const style = getMindsetTagStyle(option.tag);
        return style.category === selectedCategory;
      });
    }

    return filtered;
  }, [searchTerm, selectedCategory]);

  const isTagSelected = (tag: MindsetTagType) => {
    return selectedTags.some(selected => selected.tag === tag);
  };

  const getSelectedTag = (tag: MindsetTagType) => {
    return selectedTags.find(selected => selected.tag === tag);
  };

  const handleTagToggle = (tag: MindsetTagType) => {
    if (disabled) return;

    const isSelected = isTagSelected(tag);
    
    if (isSelected) {
      // Remove tag
      onTagsChange(selectedTags.filter(selected => selected.tag !== tag));
    } else {
      // Add tag (if under limit)
      if (selectedTags.length >= maxSelections) {
        return; // Don't add if at max
      }
      onTagsChange([...selectedTags, { tag, intensity: IntensityLevel.MEDIUM }]);
    }
  };

  const handleIntensityChange = (tag: MindsetTagType, intensity: IntensityLevel) => {
    if (disabled) return;

    onTagsChange(
      selectedTags.map(selected => 
        selected.tag === tag ? { ...selected, intensity } : selected
      )
    );
  };

  const clearAllTags = () => {
    if (disabled) return;
    onTagsChange([]);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h3 className="text-lg font-semibold text-gray-900">
          Mindset & Psychology
        </h3>
        <p className="text-sm text-gray-500">
          Select up to {maxSelections} tags that describe your psychological state
        </p>
      </div>

      {/* Search and Filter Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search mindset tags..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            disabled={disabled}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
          />
        </div>
        
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value as any)}
          disabled={disabled}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
        >
          <option value="all">All Categories</option>
          <option value="positive">Positive States</option>
          <option value="negative">Negative States</option>
          <option value="neutral">Neutral States</option>
        </select>
      </div>

      {/* Selected Tags Count and Clear Button */}
      {selectedTags.length > 0 && (
        <div className="flex items-center justify-between bg-blue-50 p-3 rounded-md">
          <span className="text-sm text-blue-700">
            {selectedTags.length} of {maxSelections} tags selected
          </span>
          <button
            type="button"
            onClick={clearAllTags}
            disabled={disabled}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium disabled:text-gray-400"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Tag Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-64 overflow-y-auto">
        {filteredOptions.map((option) => {
          const isSelected = isTagSelected(option.tag);
          const selectedTag = getSelectedTag(option.tag);
          const style = getMindsetTagStyle(option.tag);
          
          return (
            <div
              key={option.tag}
              className={`relative border rounded-lg p-3 transition-all cursor-pointer ${
                isSelected
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={() => handleTagToggle(option.tag)}
            >
              {/* Tag Header */}
              <div className="flex items-center space-x-2 mb-2">
                <div
                  className="w-4 h-4 rounded-full flex-shrink-0"
                  style={{ backgroundColor: style.backgroundColor }}
                />
                <span className="text-sm font-medium text-gray-900 flex-1">
                  {option.label}
                </span>
                {isSelected && (
                  <svg className="w-5 h-5 text-blue-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </div>

              {/* Description */}
              <p className="text-xs text-gray-600 mb-3">{option.description}</p>

              {/* Intensity Selector (only shown when selected) */}
              {isSelected && selectedTag && (
                <div className="border-t border-gray-200 pt-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Intensity
                  </label>
                  <div className="flex space-x-1">
                    {Object.values(IntensityLevel).map((intensity) => (
                      <button
                        key={intensity}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleIntensityChange(option.tag, intensity);
                        }}
                        disabled={disabled}
                        className={`px-2 py-1 text-xs rounded transition-colors ${
                          selectedTag.intensity === intensity
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        {intensityLabels[intensity]}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* No Results Message */}
      {filteredOptions.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p>No mindset tags found matching your search.</p>
        </div>
      )}

      {/* Selection Limit Warning */}
      {selectedTags.length >= maxSelections && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
          <p className="text-sm text-yellow-800">
            You've reached the maximum of {maxSelections} mindset tags. 
            Remove a tag to select a different one.
          </p>
        </div>
      )}

      {/* Educational Note */}
      <div className="bg-gray-50 border border-gray-200 rounded-md p-3 mt-4">
        <div className="flex items-start space-x-2">
          <svg className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <div>
            <p className="text-sm font-medium text-gray-900 mb-1">Psychology Matters</p>
            <p className="text-sm text-gray-600">
              Tracking your emotional state helps identify patterns that affect your trading performance. 
              Be honest with yourself - awareness is the first step to improvement.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MindsetTagSelector;