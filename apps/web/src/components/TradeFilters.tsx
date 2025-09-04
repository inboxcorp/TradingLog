import React, { useState, useEffect } from 'react';
import { 
  TradeAnalyticsFilters, 
  IndicatorType, 
  SignalType, 
  MindsetTagType
} from '@trading-log/shared';

interface FilterOption {
  value: string;
  label: string;
  count?: number;
}

interface AvailableOptions {
  symbols: string[];
  indicators: IndicatorType[];
  signals: SignalType[];
  mindsetTags: MindsetTagType[];
}

interface TradeFiltersProps {
  filters: TradeAnalyticsFilters;
  onFiltersChange: (filters: Partial<TradeAnalyticsFilters>) => void;
  availableOptions?: AvailableOptions;
  loading?: boolean;
}

const TradeFilters: React.FC<TradeFiltersProps> = ({
  filters,
  onFiltersChange,
  availableOptions,
  loading = false
}) => {
  const [localFilters, setLocalFilters] = useState<TradeAnalyticsFilters>(filters);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['dateRange', 'outcomes'])
  );

  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  const handleFilterUpdate = (key: keyof TradeAnalyticsFilters, value: any) => {
    const newFilters = { ...localFilters, [key]: value };
    setLocalFilters(newFilters);
    onFiltersChange({ [key]: value });
  };

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const handleMultiSelectChange = (key: keyof TradeAnalyticsFilters, value: string, checked: boolean) => {
    const currentValues = (localFilters[key] as string[]) || [];
    const newValues = checked
      ? [...currentValues, value]
      : currentValues.filter(v => v !== value);
    
    handleFilterUpdate(key, newValues.length > 0 ? newValues : undefined);
  };

  const clearAllFilters = () => {
    const emptyFilters: TradeAnalyticsFilters = {};
    setLocalFilters(emptyFilters);
    onFiltersChange(emptyFilters);
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (localFilters.dateRange) count++;
    if (localFilters.symbols?.length) count++;
    if (localFilters.indicators?.length) count++;
    if (localFilters.signals?.length) count++;
    if (localFilters.mindsetTags?.length) count++;
    if (localFilters.outcomes?.length) count++;
    if (localFilters.alignmentLevels?.length) count++;
    if (localFilters.tradeDirections?.length) count++;
    if (localFilters.riskRange) count++;
    return count;
  };

  const FilterSection: React.FC<{ title: string; section: string; children: React.ReactNode }> = ({ 
    title, 
    section, 
    children 
  }) => (
    <div className="border-b border-gray-200 pb-4 mb-4">
      <button
        onClick={() => toggleSection(section)}
        className="flex items-center justify-between w-full py-2 text-left"
      >
        <h4 className="text-sm font-medium text-gray-900">{title}</h4>
        <svg
          className={`w-4 h-4 transition-transform ${
            expandedSections.has(section) ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {expandedSections.has(section) && <div className="mt-2 space-y-2">{children}</div>}
    </div>
  );

  const MultiSelectFilter: React.FC<{ 
    options: FilterOption[]; 
    selectedValues: string[] | undefined;
    onSelectionChange: (value: string, checked: boolean) => void;
    placeholder: string;
  }> = ({ options, selectedValues = [], onSelectionChange, placeholder }) => (
    <div className="space-y-2">
      {options.length === 0 ? (
        <p className="text-sm text-gray-500">{placeholder}</p>
      ) : (
        options.map((option) => (
          <label key={option.value} className="flex items-center">
            <input
              type="checkbox"
              checked={selectedValues.includes(option.value)}
              onChange={(e) => onSelectionChange(option.value, e.target.checked)}
              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="ml-2 text-sm text-gray-700">
              {option.label}
              {option.count !== undefined && (
                <span className="ml-1 text-gray-500">({option.count})</span>
              )}
            </span>
          </label>
        ))
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
          <div className="space-y-2">
            <div className="h-3 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Filter Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <h3 className="text-sm font-medium text-gray-900">Filters</h3>
          {getActiveFilterCount() > 0 && (
            <span className="ml-2 px-2 py-1 text-xs bg-indigo-100 text-indigo-800 rounded-full">
              {getActiveFilterCount()}
            </span>
          )}
        </div>
        {getActiveFilterCount() > 0 && (
          <button
            onClick={clearAllFilters}
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Date Range Filter */}
      <FilterSection title="Date Range" section="dateRange">
        <div className="grid grid-cols-1 gap-2">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">From</label>
            <input
              type="date"
              value={localFilters.dateRange?.startDate?.toISOString().split('T')[0] || ''}
              onChange={(e) => {
                const startDate = e.target.value ? new Date(e.target.value) : undefined;
                handleFilterUpdate('dateRange', startDate ? {
                  startDate,
                  endDate: localFilters.dateRange?.endDate || new Date()
                } : undefined);
              }}
              className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">To</label>
            <input
              type="date"
              value={localFilters.dateRange?.endDate?.toISOString().split('T')[0] || ''}
              onChange={(e) => {
                const endDate = e.target.value ? new Date(e.target.value) : undefined;
                handleFilterUpdate('dateRange', endDate ? {
                  startDate: localFilters.dateRange?.startDate || new Date(),
                  endDate
                } : undefined);
              }}
              className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>
      </FilterSection>

      {/* Outcome Filter */}
      <FilterSection title="Outcomes" section="outcomes">
        <MultiSelectFilter
          options={[
            { value: 'WIN', label: '🟢 Winning Trades' },
            { value: 'LOSS', label: '🔴 Losing Trades' },
            { value: 'BREAKEVEN', label: '⚪ Breakeven Trades' }
          ]}
          selectedValues={localFilters.outcomes}
          onSelectionChange={(value, checked) => handleMultiSelectChange('outcomes', value, checked)}
          placeholder="No outcome filters"
        />
      </FilterSection>

      {/* Trade Direction Filter */}
      <FilterSection title="Trade Direction" section="direction">
        <MultiSelectFilter
          options={[
            { value: 'LONG', label: '📈 Long Trades' },
            { value: 'SHORT', label: '📉 Short Trades' }
          ]}
          selectedValues={localFilters.tradeDirections}
          onSelectionChange={(value, checked) => handleMultiSelectChange('tradeDirections', value, checked)}
          placeholder="All directions"
        />
      </FilterSection>

      {/* Symbols Filter */}
      <FilterSection title="Symbols" section="symbols">
        <MultiSelectFilter
          options={availableOptions?.symbols.map(symbol => ({
            value: symbol,
            label: symbol
          })) || []}
          selectedValues={localFilters.symbols}
          onSelectionChange={(value, checked) => handleMultiSelectChange('symbols', value, checked)}
          placeholder="No symbols available"
        />
      </FilterSection>

      {/* Indicators Filter */}
      <FilterSection title="Indicators" section="indicators">
        <MultiSelectFilter
          options={availableOptions?.indicators.map(indicator => ({
            value: indicator,
            label: indicator.replace(/_/g, ' ')
          })) || []}
          selectedValues={localFilters.indicators}
          onSelectionChange={(value, checked) => handleMultiSelectChange('indicators', value, checked)}
          placeholder="No indicators available"
        />
      </FilterSection>

      {/* Signals Filter */}
      <FilterSection title="Signals" section="signals">
        <MultiSelectFilter
          options={availableOptions?.signals.map(signal => ({
            value: signal,
            label: signal.replace(/_/g, ' ')
          })) || []}
          selectedValues={localFilters.signals}
          onSelectionChange={(value, checked) => handleMultiSelectChange('signals', value, checked)}
          placeholder="No signals available"
        />
      </FilterSection>

      {/* Mindset Tags Filter */}
      <FilterSection title="Mindset Tags" section="mindsetTags">
        <MultiSelectFilter
          options={availableOptions?.mindsetTags.map(tag => ({
            value: tag,
            label: tag.replace(/_/g, ' ')
          })) || []}
          selectedValues={localFilters.mindsetTags}
          onSelectionChange={(value, checked) => handleMultiSelectChange('mindsetTags', value, checked)}
          placeholder="No mindset tags available"
        />
      </FilterSection>

      {/* Risk Range Filter */}
      <FilterSection title="Risk Range" section="riskRange">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Min ($)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={localFilters.riskRange?.min || ''}
              onChange={(e) => {
                const min = e.target.value ? parseFloat(e.target.value) : undefined;
                handleFilterUpdate('riskRange', min !== undefined || localFilters.riskRange?.max !== undefined ? {
                  min: min || 0,
                  max: localFilters.riskRange?.max || 10000
                } : undefined);
              }}
              className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="0"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Max ($)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={localFilters.riskRange?.max || ''}
              onChange={(e) => {
                const max = e.target.value ? parseFloat(e.target.value) : undefined;
                handleFilterUpdate('riskRange', max !== undefined || localFilters.riskRange?.min !== undefined ? {
                  min: localFilters.riskRange?.min || 0,
                  max: max || 10000
                } : undefined);
              }}
              className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="10000"
            />
          </div>
        </div>
      </FilterSection>
    </div>
  );
};

export default TradeFilters;