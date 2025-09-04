import { z } from 'zod';
import { IndicatorType, SignalType, TimeframeType, DivergenceType, MethodAnalysis } from './analysis';
import { TradeDirection } from '.';

// Alignment Types
export type AlignmentLevel = 'STRONG_CONFLICT' | 'WEAK_CONFLICT' | 'NEUTRAL' | 'WEAK_ALIGNMENT' | 'STRONG_ALIGNMENT';

export interface AlignmentRule {
  indicator: IndicatorType | 'ANY';
  signal: SignalType | 'ANY';
  bullishAlignment: number; // -1 to 1 scale
  bearishAlignment: number; // -1 to 1 scale
  weight: number; // Importance weight
}

export interface TimeframeAlignmentBreakdown {
  timeframe: TimeframeType;
  score: number;
  analysis: MethodAnalysis;
  alignment: 'ALIGNED' | 'CONFLICTED' | 'NEUTRAL';
}

export interface AlignmentAnalysis {
  overallScore: number; // -1 to 1 scale
  alignmentLevel: AlignmentLevel;
  warnings: string[];
  confirmations: string[];
  timeframeBreakdown: TimeframeAlignmentBreakdown[];
}

// Zod Validation Schemas
export const AlignmentLevelSchema = z.enum(['STRONG_CONFLICT', 'WEAK_CONFLICT', 'NEUTRAL', 'WEAK_ALIGNMENT', 'STRONG_ALIGNMENT']);

export const AlignmentRuleSchema = z.object({
  indicator: z.union([z.nativeEnum(IndicatorType), z.literal('ANY')]),
  signal: z.union([z.nativeEnum(SignalType), z.literal('ANY')]),
  bullishAlignment: z.number().min(-1).max(1),
  bearishAlignment: z.number().min(-1).max(1),
  weight: z.number().min(0).max(1),
});

export const TimeframeAlignmentBreakdownSchema = z.object({
  timeframe: z.nativeEnum(TimeframeType),
  score: z.number().min(-1).max(1),
  analysis: z.any(), // MethodAnalysis type
  alignment: z.enum(['ALIGNED', 'CONFLICTED', 'NEUTRAL']),
});

export const AlignmentAnalysisSchema = z.object({
  overallScore: z.number().min(-1).max(1),
  alignmentLevel: AlignmentLevelSchema,
  warnings: z.array(z.string()),
  confirmations: z.array(z.string()),
  timeframeBreakdown: z.array(TimeframeAlignmentBreakdownSchema),
});

// Request/Response Types
export const AnalyzeAlignmentRequestSchema = z.object({
  direction: z.enum(['LONG', 'SHORT']),
  methodAnalysis: z.array(z.any()), // MethodAnalysis array
});

export type AnalyzeAlignmentRequest = z.infer<typeof AnalyzeAlignmentRequestSchema>;

// API Response Types
export interface AlignmentAnalysisResponse {
  success: boolean;
  data?: AlignmentAnalysis;
  error?: string;
}