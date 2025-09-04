import { z } from 'zod';
import { TradeWithAlignment } from './index';
import { AlignmentLevel } from './alignment';
import { MindsetTagType, IntensityLevel } from './mindset';
import { IndicatorType, SignalType } from './analysis';

// Analytics Filter Types
export interface TradeAnalyticsFilters {
  dateRange?: {
    startDate: Date;
    endDate: Date;
  };
  symbols?: string[];
  indicators?: IndicatorType[];
  signals?: SignalType[];
  mindsetTags?: MindsetTagType[];
  outcomes?: ('WIN' | 'LOSS' | 'BREAKEVEN')[];
  alignmentLevels?: AlignmentLevel[];
  riskRange?: {
    min: number;
    max: number;
  };
  tradeDirections?: ('LONG' | 'SHORT')[];
  // gradeFilter will be added in story 4.3
}

// Extended Trade Interface for Analytics
export interface TradeWithFullAnalysis extends TradeWithAlignment {
  outcome: 'WIN' | 'LOSS' | 'BREAKEVEN';
  returnPercentage: number;
  // grade will be added in story 4.3
}

// Placeholder for trade grade types (to be implemented in story 4.3)

// Analytics Result Types
export interface TradeAnalyticsResult {
  trades: TradeWithFullAnalysis[];
  totalCount: number;
  filteredCount: number;
  summary: {
    winRate: number;
    totalPnL: number;
    averageRisk: number;
    mostCommonIndicator?: IndicatorType;
    dominantMindset?: MindsetTagType;
  };
}

// Filter Preset Types
export interface FilterPreset {
  id: string;
  name: string;
  description: string;
  filters: TradeAnalyticsFilters;
  isDefault?: boolean;
}

export const DEFAULT_FILTER_PRESETS: FilterPreset[] = [
  {
    id: 'all-trades',
    name: 'All Trades',
    description: 'Complete trade history',
    filters: {},
    isDefault: true
  },
  {
    id: 'winning-trades',
    name: 'Winning Trades',
    description: 'Profitable trades only',
    filters: { outcomes: ['WIN'] }
  },
  {
    id: 'high-alignment',
    name: 'High Alignment',
    description: 'Trades with strong signal alignment',
    filters: { alignmentLevels: ['STRONG_ALIGNMENT', 'WEAK_ALIGNMENT'] }
  },
  {
    id: 'disciplined-trades',
    name: 'Disciplined Trading',
    description: 'Trades with positive mindset',
    filters: { mindsetTags: [MindsetTagType.DISCIPLINED, MindsetTagType.PATIENT, MindsetTagType.FOCUSED] }
  }
];

// Zod Schemas for Validation
export const TradeAnalyticsFiltersSchema = z.object({
  dateRange: z.object({
    startDate: z.date(),
    endDate: z.date()
  }).optional(),
  symbols: z.array(z.string()).optional(),
  indicators: z.array(z.string()).optional(),
  signals: z.array(z.string()).optional(),
  mindsetTags: z.array(z.string()).optional(),
  outcomes: z.array(z.enum(['WIN', 'LOSS', 'BREAKEVEN'])).optional(),
  alignmentLevels: z.array(z.string()).optional(),
  riskRange: z.object({
    min: z.number().min(0),
    max: z.number().min(0)
  }).optional(),
  tradeDirections: z.array(z.enum(['LONG', 'SHORT'])).optional(),
  // gradeFilter will be added in story 4.3
});

export const FilterPresetSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  description: z.string(),
  filters: TradeAnalyticsFiltersSchema,
  isDefault: z.boolean().optional()
});

// Export Analytics Context State Interface
export interface AnalyticsContextState {
  filters: TradeAnalyticsFilters;
  filteredTrades: TradeWithFullAnalysis[];
  summary: TradeAnalyticsResult['summary'];
  loading: boolean;
  updateFilters: (filters: Partial<TradeAnalyticsFilters>) => void;
  clearFilters: () => void;
  exportResults: (format: 'CSV' | 'JSON') => Promise<void>;
}