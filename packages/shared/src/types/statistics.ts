import { z } from 'zod';
import { TradeWithFullAnalysis } from './analytics';

// Performance Statistics Interface
export interface PerformanceStatistics {
  // Basic Metrics
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  breakevenTrades: number;
  
  // Win/Loss Analysis
  winRate: number; // Percentage
  lossRate: number; // Percentage
  winLossRatio: number; // Wins / Losses
  
  // Profit/Loss Metrics
  totalPnL: number;
  averageProfit: number; // Average of winning trades only
  averageLoss: number; // Average of losing trades only
  averageTrade: number; // Average of all trades
  
  // Risk-Adjusted Metrics
  expectancy: number; // (Win% × Avg Win) - (Loss% × Avg Loss)
  profitFactor: number; // Gross Profit / Gross Loss
  recoveryFactor: number; // Total PnL / Max Drawdown
  
  // Advanced Metrics
  maxWin: number;
  maxLoss: number;
  maxConsecutiveWins: number;
  maxConsecutiveLosses: number;
  currentStreak: number;
  streakType: 'WIN' | 'LOSS' | 'NONE';
  
  // Risk Metrics
  averageRisk: number;
  riskAdjustedReturn: number;
  maxDrawdown: number;
  sharpeRatio: number;
  
  // Time-based Analysis
  averageHoldTime: number; // In hours
  tradingFrequency: number; // Trades per month
  bestMonth: string;
  worstMonth: string;
}

// Statistical Significance Interface
export interface StatisticalSignificance {
  sampleSize: number;
  confidenceLevel: number;
  isSignificant: boolean;
  marginOfError: number;
  recommendation: string;
}

// Performance Comparison Interface
export interface PerformanceComparison {
  baselineStats: PerformanceStatistics;
  currentStats: PerformanceStatistics;
  improvements: {
    winRate: number;
    profitFactor: number;
    expectancy: number;
    averageRisk: number;
  };
  significance: StatisticalSignificance;
}

// Performance Benchmarks
export interface PerformanceBenchmarks {
  profitFactor: {
    excellent: number;
    good: number;
    acceptable: number;
    poor: number;
  };
  winRate: {
    excellent: number;
    good: number;
    acceptable: number;
    poor: number;
  };
  expectancy: {
    excellent: number;
    good: number;
    acceptable: number;
    poor: number;
  };
}

export const PERFORMANCE_BENCHMARKS: PerformanceBenchmarks = {
  profitFactor: {
    excellent: 2.0,
    good: 1.5,
    acceptable: 1.25,
    poor: 1.0
  },
  winRate: {
    excellent: 70,
    good: 60,
    acceptable: 50,
    poor: 40
  },
  expectancy: {
    excellent: 0.02, // 2% per trade
    good: 0.01,      // 1% per trade
    acceptable: 0.005, // 0.5% per trade
    poor: 0          // Breakeven
  }
};

export type BenchmarkLevel = 'excellent' | 'good' | 'acceptable' | 'poor';

// Statistics Export Interface
export interface StatisticsExport {
  statistics: PerformanceStatistics;
  filters: any; // TradeAnalyticsFilters from analytics.ts
  generatedAt: Date;
  tradeCount: number;
  dateRange: string;
}

// Enhanced Analytics Response (extends analytics.ts)
export interface AnalyticsResponse {
  trades: TradeWithFullAnalysis[];
  statistics: PerformanceStatistics;
  totalCount: number;
  filteredCount: number;
  comparisonStats?: {
    allTrades: PerformanceStatistics;
    filtered: PerformanceStatistics;
    improvement: number;
  };
}

// Zod Schemas for Validation
export const PerformanceStatisticsSchema = z.object({
  totalTrades: z.number().min(0),
  winningTrades: z.number().min(0),
  losingTrades: z.number().min(0),
  breakevenTrades: z.number().min(0),
  winRate: z.number().min(0).max(100),
  lossRate: z.number().min(0).max(100),
  winLossRatio: z.number().min(0),
  totalPnL: z.number(),
  averageProfit: z.number(),
  averageLoss: z.number(),
  averageTrade: z.number(),
  expectancy: z.number(),
  profitFactor: z.number().min(0),
  recoveryFactor: z.number(),
  maxWin: z.number(),
  maxLoss: z.number(),
  maxConsecutiveWins: z.number().min(0),
  maxConsecutiveLosses: z.number().min(0),
  currentStreak: z.number(),
  streakType: z.enum(['WIN', 'LOSS', 'NONE']),
  averageRisk: z.number().min(0),
  riskAdjustedReturn: z.number(),
  maxDrawdown: z.number(),
  sharpeRatio: z.number(),
  averageHoldTime: z.number().min(0),
  tradingFrequency: z.number().min(0),
  bestMonth: z.string(),
  worstMonth: z.string()
});

export const StatisticalSignificanceSchema = z.object({
  sampleSize: z.number().min(0),
  confidenceLevel: z.number().min(0).max(100),
  isSignificant: z.boolean(),
  marginOfError: z.number().min(0),
  recommendation: z.string()
});

// Statistics calculation utility function types
export type StatisticsCalculator = (trades: TradeWithFullAnalysis[]) => PerformanceStatistics;
export type SignificanceAssessor = (trades: TradeWithFullAnalysis[]) => StatisticalSignificance;
export type BenchmarkEvaluator = (metric: keyof PerformanceBenchmarks, value: number) => BenchmarkLevel;