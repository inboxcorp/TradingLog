import { z } from 'zod';

// Method Analysis Enums
export enum IndicatorType {
  MACD = 'MACD',
  RSI = 'RSI',
  STOCHASTICS = 'STOCHASTICS',
  MOVING_AVERAGES = 'MOVING_AVERAGES',
  BOLLINGER_BANDS = 'BOLLINGER_BANDS',
  VOLUME = 'VOLUME',
  SUPPORT_RESISTANCE = 'SUPPORT_RESISTANCE',
  TRENDLINES = 'TRENDLINES',
  FIBONACCI = 'FIBONACCI',
  OTHER = 'OTHER'
}

export enum SignalType {
  BUY_SIGNAL = 'BUY_SIGNAL',
  SELL_SIGNAL = 'SELL_SIGNAL',
  CONTINUATION = 'CONTINUATION',
  REVERSAL = 'REVERSAL',
  BREAKOUT = 'BREAKOUT',
  BREAKDOWN = 'BREAKDOWN',
  OVERSOLD = 'OVERSOLD',
  OVERBOUGHT = 'OVERBOUGHT',
  NEUTRAL = 'NEUTRAL'
}

export enum TimeframeType {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY'
}

export enum DivergenceType {
  BULLISH = 'BULLISH',
  BEARISH = 'BEARISH',
  NONE = 'NONE'
}

// Method Analysis Interface
export interface MethodAnalysis {
  id: string;
  tradeId: string;
  timeframe: TimeframeType;
  indicator: IndicatorType;
  signal: SignalType;
  divergence: DivergenceType;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// Type-safe string versions for Prisma compatibility
export type TimeframeTypeString = keyof typeof TimeframeType;
export type IndicatorTypeString = keyof typeof IndicatorType;
export type SignalTypeString = keyof typeof SignalType;
export type DivergenceTypeString = keyof typeof DivergenceType;

// Zod Validation Schemas
export const IndicatorTypeSchema = z.nativeEnum(IndicatorType);
export const SignalTypeSchema = z.nativeEnum(SignalType);
export const TimeframeTypeSchema = z.nativeEnum(TimeframeType);
export const DivergenceTypeSchema = z.nativeEnum(DivergenceType);

export const MethodAnalysisSchema = z.object({
  id: z.string().cuid(),
  tradeId: z.string().cuid(),
  timeframe: TimeframeTypeSchema,
  indicator: IndicatorTypeSchema,
  signal: SignalTypeSchema,
  divergence: DivergenceTypeSchema,
  notes: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CreateMethodAnalysisSchema = z.object({
  timeframe: TimeframeTypeSchema,
  indicator: IndicatorTypeSchema,
  signal: SignalTypeSchema,
  divergence: DivergenceTypeSchema.default(DivergenceType.NONE),
  notes: z.string().optional(),
});

export const UpdateMethodAnalysisSchema = z.object({
  indicator: IndicatorTypeSchema.optional(),
  signal: SignalTypeSchema.optional(),
  divergence: DivergenceTypeSchema.optional(),
  notes: z.string().nullable().optional(),
});

// Request/Response Types
export type CreateMethodAnalysisRequest = z.infer<typeof CreateMethodAnalysisSchema>;
export type UpdateMethodAnalysisRequest = z.infer<typeof UpdateMethodAnalysisSchema>;

// Validation Helper
export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export const validateMethodAnalysis = (analysis: CreateMethodAnalysisRequest[]): ValidationResult => {
  // Ensure one analysis per timeframe
  const timeframes = analysis.map(a => a.timeframe);
  if (new Set(timeframes).size !== timeframes.length) {
    return { isValid: false, error: 'Duplicate timeframe analysis' };
  }
  
  // Validate required fields
  for (const item of analysis) {
    if (!item.indicator || !item.signal) {
      return { 
        isValid: false, 
        error: `Missing indicator or signal for ${item.timeframe}` 
      };
    }
  }
  
  return { isValid: true };
};