import { z } from 'zod';
import { TradeWithAlignment } from './index';

// Re-export TradeWithAlignment for external use
export { TradeWithAlignment };

// Grade Level Enum
export enum GradeLevel {
  A_PLUS = 'A+',
  A = 'A',
  A_MINUS = 'A-',
  B_PLUS = 'B+',
  B = 'B',
  B_MINUS = 'B-',
  C_PLUS = 'C+',
  C = 'C',
  C_MINUS = 'C-',
  D = 'D',
  F = 'F'
}

// Grade Component Interface
export interface GradeComponent {
  score: number; // 0-100
  weight: number; // Contribution to overall grade
  factors: string[];
  improvements: string[];
}

// Complete Trade Grade Interface
export interface TradeGrade {
  overall: GradeLevel;
  breakdown: {
    riskManagement: GradeComponent;
    methodAlignment: GradeComponent;
    mindsetQuality: GradeComponent;
    execution: GradeComponent;
  };
  score: number; // 0-100 scale
  explanation: string[];
  recommendations: string[];
}

// Trade Grade History Entry
export interface GradeHistoryEntry {
  id: string;
  tradeId: string;
  grade: GradeLevel;
  score: number;
  reason: 'TRADE_CLOSE' | 'ANALYSIS_UPDATE' | 'MINDSET_UPDATE' | 'MANUAL_RECALC';
  calculatedAt: Date;
}

// Extended Trade Interface with Grading
export interface TradeWithGrade extends TradeWithAlignment {
  grade?: TradeGrade;
  gradeHistory?: GradeHistoryEntry[];
  user?: {
    id: string;
    email: string;
    totalEquity: number;
    createdAt: Date;
    updatedAt: Date;
  };
  targetPrice?: number;
}

// Grade Analytics Interface
export interface GradeAnalytics {
  gradeDistribution: Record<GradeLevel, number>;
  averageGrade: number;
  gradeImprovement: {
    trend: 'IMPROVING' | 'DECLINING' | 'STABLE';
    changeRate: number;
    recentAverage: number;
    historicalAverage: number;
  };
  correlations: {
    gradeVsOutcome: number;
    gradeVsRisk: number;
    gradeVsAlignment: number;
  };
}

// Grade Color System
export const GRADE_COLORS: Record<GradeLevel, string> = {
  [GradeLevel.A_PLUS]: '#10b981', // emerald-500 - Excellent
  [GradeLevel.A]: '#10b981',      // emerald-500 - Excellent
  [GradeLevel.A_MINUS]: '#22c55e', // green-500 - Very Good
  [GradeLevel.B_PLUS]: '#22c55e',  // green-500 - Very Good
  [GradeLevel.B]: '#84cc16',       // lime-500 - Good
  [GradeLevel.B_MINUS]: '#84cc16', // lime-500 - Good
  [GradeLevel.C_PLUS]: '#eab308',  // yellow-500 - Average
  [GradeLevel.C]: '#eab308',       // yellow-500 - Average
  [GradeLevel.C_MINUS]: '#f97316', // orange-500 - Below Average
  [GradeLevel.D]: '#f97316',       // orange-500 - Below Average
  [GradeLevel.F]: '#ef4444'        // red-500 - Poor
};

// Grade Categories for Filtering
export const GRADE_CATEGORIES = {
  excellent: [GradeLevel.A_PLUS, GradeLevel.A, GradeLevel.A_MINUS],
  good: [GradeLevel.B_PLUS, GradeLevel.B, GradeLevel.B_MINUS],
  average: [GradeLevel.C_PLUS, GradeLevel.C, GradeLevel.C_MINUS],
  poor: [GradeLevel.D, GradeLevel.F]
};

// Grade Calculation Configuration
export interface GradingConfiguration {
  weights: {
    riskManagement: number;    // Default: 0.35
    methodAlignment: number;   // Default: 0.30
    mindsetQuality: number;    // Default: 0.25
    execution: number;         // Default: 0.10
  };
  riskThresholds: {
    excellent: number;         // ≤1.5%
    good: number;              // ≤2.0%
    acceptable: number;        // ≤3.0%
  };
  alignmentScoring: {
    strongAlignment: number;   // Bonus points
    weakAlignment: number;     // Small bonus
    neutral: number;           // No change
    weakConflict: number;      // Penalty
    strongConflict: number;    // Large penalty
  };
}

export const DEFAULT_GRADING_CONFIG: GradingConfiguration = {
  weights: {
    riskManagement: 0.35,
    methodAlignment: 0.30,
    mindsetQuality: 0.25,
    execution: 0.10
  },
  riskThresholds: {
    excellent: 1.5,
    good: 2.0,
    acceptable: 3.0
  },
  alignmentScoring: {
    strongAlignment: 20,
    weakAlignment: 10,
    neutral: 0,
    weakConflict: -10,
    strongConflict: -25
  }
};

// Mindset Tag Scoring
export const MINDSET_SCORING = {
  positive: ['DISCIPLINED', 'PATIENT', 'CONFIDENT', 'FOCUSED', 'CALM', 'ANALYTICAL'],
  negative: ['ANXIOUS', 'FOMO', 'GREEDY', 'FEARFUL', 'IMPULSIVE', 'REVENGE_TRADING', 'OVERCONFIDENT']
};

// Coaching Recommendations
export interface CoachingRecommendation {
  category: 'RISK_MANAGEMENT' | 'METHOD_ALIGNMENT' | 'MINDSET_QUALITY' | 'EXECUTION';
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  message: string;
  actionItems: string[];
}

// Zod Schemas for Validation
export const GradeLevelSchema = z.nativeEnum(GradeLevel);

export const GradeComponentSchema = z.object({
  score: z.number().min(0).max(100),
  weight: z.number().min(0).max(1),
  factors: z.array(z.string()),
  improvements: z.array(z.string())
});

export const TradeGradeSchema = z.object({
  overall: GradeLevelSchema,
  breakdown: z.object({
    riskManagement: GradeComponentSchema,
    methodAlignment: GradeComponentSchema,
    mindsetQuality: GradeComponentSchema,
    execution: GradeComponentSchema
  }),
  score: z.number().min(0).max(100),
  explanation: z.array(z.string()),
  recommendations: z.array(z.string())
});

export const GradeHistoryEntrySchema = z.object({
  id: z.string().cuid(),
  tradeId: z.string().cuid(),
  grade: GradeLevelSchema,
  score: z.number().min(0).max(100),
  reason: z.enum(['TRADE_CLOSE', 'ANALYSIS_UPDATE', 'MINDSET_UPDATE', 'MANUAL_RECALC']),
  calculatedAt: z.date()
});

export const GradeAnalyticsSchema = z.object({
  gradeDistribution: z.record(z.string(), z.number()),
  averageGrade: z.number().min(0).max(100),
  gradeImprovement: z.object({
    trend: z.enum(['IMPROVING', 'DECLINING', 'STABLE']),
    changeRate: z.number(),
    recentAverage: z.number(),
    historicalAverage: z.number()
  }),
  correlations: z.object({
    gradeVsOutcome: z.number().min(-1).max(1),
    gradeVsRisk: z.number().min(-1).max(1),
    gradeVsAlignment: z.number().min(-1).max(1)
  })
});

// Grade Recalculation Request
export const RecalculateGradeRequestSchema = z.object({
  reason: z.enum(['ANALYSIS_UPDATE', 'MINDSET_UPDATE', 'MANUAL_RECALC']).optional().default('MANUAL_RECALC')
});

export type RecalculateGradeRequest = z.infer<typeof RecalculateGradeRequestSchema>;

// Grade Filter Request
export const GradeFilterSchema = z.object({
  grades: z.array(GradeLevelSchema).optional(),
  categories: z.array(z.enum(['excellent', 'good', 'average', 'poor'])).optional(),
  minScore: z.number().min(0).max(100).optional(),
  maxScore: z.number().min(0).max(100).optional()
});

export type GradeFilter = z.infer<typeof GradeFilterSchema>;

// Extended Trade with User for Grading Calculations
export interface TradeForGrading extends TradeWithAlignment {
  user: {
    id: string;
    email: string;
    totalEquity: number;
    createdAt: Date;
    updatedAt: Date;
  };
  targetPrice?: number;
}

// Utility Types for Grade Calculation
export type GradeCalculator = (trade: TradeForGrading) => TradeGrade;
export type ComponentScorer = (trade: TradeForGrading) => GradeComponent;
export type GradeColorMapper = (grade: GradeLevel) => string;
export type CoachingGenerator = (recentGrades: TradeGrade[]) => CoachingRecommendation[];