import express, { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { 
  TradeAnalyticsFilters,
  TradeAnalyticsFiltersSchema,
  TradeAnalyticsResult,
  TradeWithFullAnalysis,
  DEFAULT_FILTER_PRESETS,
  IndicatorType,
  SignalType,
  MindsetTagType,
  AlignmentLevel,
  AlignmentAnalysis,
  TradeWithAlignment,
  AnalyticsResponse,
  PerformanceStatistics,
  calculatePerformanceStatistics,
  assessStatisticalSignificance
} from '@trading-log/shared';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

// Query parameter schema for URL encoding
const QueryTradeAnalyticsFiltersSchema = z.object({
  'dateRange[startDate]': z.string().optional(),
  'dateRange[endDate]': z.string().optional(),
  symbols: z.union([z.string(), z.array(z.string())]).optional(),
  indicators: z.union([z.string(), z.array(z.string())]).optional(),
  signals: z.union([z.string(), z.array(z.string())]).optional(),
  mindsetTags: z.union([z.string(), z.array(z.string())]).optional(),
  outcomes: z.union([z.string(), z.array(z.string())]).optional(),
  alignmentLevels: z.union([z.string(), z.array(z.string())]).optional(),
  'riskRange[min]': z.string().optional(),
  'riskRange[max]': z.string().optional(),
  tradeDirections: z.union([z.string(), z.array(z.string())]).optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

// Helper function to parse query parameters to filters
const parseQueryFilters = (query: any): TradeAnalyticsFilters => {
  const filters: TradeAnalyticsFilters = {};
  
  // Date range parsing
  if (query['dateRange[startDate]'] && query['dateRange[endDate]']) {
    filters.dateRange = {
      startDate: new Date(query['dateRange[startDate]']),
      endDate: new Date(query['dateRange[endDate]']),
    };
  }
  
  // Array field parsing
  const parseArrayField = (field: string | string[] | undefined): string[] | undefined => {
    if (!field) return undefined;
    return Array.isArray(field) ? field : [field];
  };
  
  filters.symbols = parseArrayField(query.symbols);
  filters.indicators = parseArrayField(query.indicators) as IndicatorType[] | undefined;
  filters.signals = parseArrayField(query.signals) as SignalType[] | undefined;
  filters.mindsetTags = parseArrayField(query.mindsetTags) as MindsetTagType[] | undefined;
  filters.outcomes = parseArrayField(query.outcomes) as ('WIN' | 'LOSS' | 'BREAKEVEN')[] | undefined;
  filters.alignmentLevels = parseArrayField(query.alignmentLevels) as AlignmentLevel[] | undefined;
  filters.tradeDirections = parseArrayField(query.tradeDirections) as ('LONG' | 'SHORT')[] | undefined;
  
  // Risk range parsing - handle both bracket notation and nested object
  if (query['riskRange[min]'] || query['riskRange[max]'] || query.riskRange) {
    let min: number, max: number;
    
    if (query.riskRange && typeof query.riskRange === 'object') {
      // Handle nested object format: { riskRange: { min: '40', max: '60' } }
      min = query.riskRange.min ? parseFloat(query.riskRange.min) : 0;
      max = query.riskRange.max ? parseFloat(query.riskRange.max) : Number.MAX_SAFE_INTEGER;
    } else {
      // Handle bracket notation format: { 'riskRange[min]': '40', 'riskRange[max]': '60' }
      min = query['riskRange[min]'] ? parseFloat(query['riskRange[min]']) : 0;
      max = query['riskRange[max]'] ? parseFloat(query['riskRange[max]']) : Number.MAX_SAFE_INTEGER;
    }
    
    filters.riskRange = { min, max };
  }
  
  return filters;
};

// Helper function to build Prisma where clause
const buildFilterQuery = (filters: TradeAnalyticsFilters, userId: string) => {
  const where: any = { userId };
  
  // Date range filter
  if (filters.dateRange) {
    where.entryDate = {
      gte: filters.dateRange.startDate,
      lte: filters.dateRange.endDate,
    };
  }
  
  // Symbol filter
  if (filters.symbols && filters.symbols.length > 0) {
    where.symbol = { in: filters.symbols };
  }
  
  // Risk range filter
  if (filters.riskRange) {
    where.riskAmount = {
      gte: filters.riskRange.min,
      lte: filters.riskRange.max,
    };
  }
  
  // Trade direction filter
  if (filters.tradeDirections && filters.tradeDirections.length > 0) {
    where.direction = { in: filters.tradeDirections };
  }
  
  // Outcome filter (based on realizedPnL)
  if (filters.outcomes && filters.outcomes.length > 0) {
    const outcomeConditions = filters.outcomes.map((outcome: 'WIN' | 'LOSS' | 'BREAKEVEN') => {
      switch (outcome) {
        case 'WIN': return { realizedPnL: { gt: 0 } };
        case 'LOSS': return { realizedPnL: { lt: 0 } };
        case 'BREAKEVEN': return { realizedPnL: 0 };
        default: return {};
      }
    });
    
    if (outcomeConditions.length === 1) {
      Object.assign(where, outcomeConditions[0]);
    } else {
      where.OR = outcomeConditions;
    }
  }
  
  // Method analysis filters
  if ((filters.indicators && filters.indicators.length > 0) || 
      (filters.signals && filters.signals.length > 0)) {
    where.methodAnalysis = { some: {} };
    
    if (filters.indicators && filters.indicators.length > 0) {
      where.methodAnalysis.some.indicator = { in: filters.indicators };
    }
    
    if (filters.signals && filters.signals.length > 0) {
      where.methodAnalysis.some.signal = { in: filters.signals };
    }
  }
  
  // Mindset tags filter
  if (filters.mindsetTags && filters.mindsetTags.length > 0) {
    where.mindsetTags = {
      some: {
        tag: { in: filters.mindsetTags }
      }
    };
  }
  
  // Alignment level filter
  if (filters.alignmentLevels && filters.alignmentLevels.length > 0) {
    where.alignmentLevel = { in: filters.alignmentLevels };
  }
  
  return where;
};

// Helper function to calculate trade outcome and return percentage
const enhanceTradeWithAnalysis = (trade: any): TradeWithFullAnalysis => {
  const outcome = trade.realizedPnL === null ? 'BREAKEVEN' :
                  trade.realizedPnL > 0 ? 'WIN' : 
                  trade.realizedPnL < 0 ? 'LOSS' : 'BREAKEVEN';
  
  const returnPercentage = trade.realizedPnL === null || trade.riskAmount === 0 ? 0 :
                          (trade.realizedPnL / trade.riskAmount) * 100;
  
  // Parse alignment analysis from JSON strings
  let alignmentAnalysis: AlignmentAnalysis | undefined;
  if (trade.alignmentScore !== null && trade.alignmentLevel !== null) {
    alignmentAnalysis = {
      overallScore: trade.alignmentScore,
      alignmentLevel: trade.alignmentLevel,
      warnings: trade.alignmentWarnings ? JSON.parse(trade.alignmentWarnings) : [],
      confirmations: trade.alignmentConfirmations ? JSON.parse(trade.alignmentConfirmations) : [],
      timeframeBreakdown: [] // TODO: Implement if needed
    };
  }
  
  return {
    ...trade,
    outcome: outcome as 'WIN' | 'LOSS' | 'BREAKEVEN',
    returnPercentage,
    alignmentAnalysis,
    direction: trade.direction as 'LONG' | 'SHORT',
    status: trade.status as 'ACTIVE' | 'CLOSED',
  };
};

// Helper function to calculate summary statistics
const calculateSummary = (trades: TradeWithFullAnalysis[]) => {
  if (trades.length === 0) {
    return {
      winRate: 0,
      totalPnL: 0,
      averageRisk: 0,
    };
  }
  
  const closedTrades = trades.filter(trade => trade.realizedPnL !== null);
  const winningTrades = closedTrades.filter(trade => trade.outcome === 'WIN');
  
  const totalPnL = closedTrades.reduce((sum, trade) => sum + (trade.realizedPnL || 0), 0);
  const averageRisk = trades.reduce((sum, trade) => sum + trade.riskAmount, 0) / trades.length;
  const winRate = closedTrades.length > 0 ? (winningTrades.length / closedTrades.length) * 100 : 0;
  
  // Find most common indicator
  const indicatorCounts = new Map<string, number>();
  trades.forEach((trade: TradeWithFullAnalysis) => {
    trade.methodAnalysis?.forEach((analysis: any) => {
      const count = indicatorCounts.get(analysis.indicator) || 0;
      indicatorCounts.set(analysis.indicator, count + 1);
    });
  });
  
  const mostCommonIndicator = indicatorCounts.size > 0 ? 
    Array.from(indicatorCounts.entries()).reduce((a, b) => a[1] > b[1] ? a : b)[0] as IndicatorType :
    undefined;
  
  // Find dominant mindset
  const mindsetCounts = new Map<string, number>();
  trades.forEach((trade: TradeWithFullAnalysis) => {
    trade.mindsetTags?.forEach((tag: any) => {
      const count = mindsetCounts.get(tag.tag) || 0;
      mindsetCounts.set(tag.tag, count + 1);
    });
  });
  
  const dominantMindset = mindsetCounts.size > 0 ?
    Array.from(mindsetCounts.entries()).reduce((a, b) => a[1] > b[1] ? a : b)[0] as MindsetTagType :
    undefined;
  
  return {
    winRate,
    totalPnL,
    averageRisk,
    mostCommonIndicator,
    dominantMindset,
  };
};

// GET /api/analytics - Get filtered trade analytics with comprehensive performance statistics
router.get('/', requireAuth, async (req: AuthRequest, res: Response<{ success: boolean; data?: AnalyticsResponse; error?: string }>) => {
  try {
    const userId = req.user!.id;
    
    // Parse and validate query parameters
    const queryValidation = QueryTradeAnalyticsFiltersSchema.safeParse(req.query);
    if (!queryValidation.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid query parameters',
      });
    }
    
    const filters = parseQueryFilters(req.query);
    
    // Parse pagination and sorting
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const sortBy = (req.query.sortBy as string) || 'entryDate';
    const sortOrder = (req.query.sortOrder as 'asc' | 'desc') || 'desc';
    const includeComparison = req.query.includeComparison === 'true';
    
    // Build where clause for filtered trades
    const filteredWhere = buildFilterQuery(filters, userId);
    
    // Get total count for pagination
    const totalCount = await prisma.trade.count({ 
      where: { userId } // Total count includes all user trades
    });
    
    // Get filtered count
    const filteredCount = await prisma.trade.count({ where: filteredWhere });
    
    // Get filtered trades with full analysis (for pagination)
    const paginatedTrades = await prisma.trade.findMany({
      where: filteredWhere,
      include: {
        methodAnalysis: true,
        mindsetTags: true,
      },
      orderBy: {
        [sortBy]: sortOrder,
      },
      skip: (page - 1) * limit,
      take: limit,
    });
    
    // Get ALL filtered trades for statistics (without pagination)
    const allFilteredTrades = await prisma.trade.findMany({
      where: filteredWhere,
      include: {
        methodAnalysis: true,
        mindsetTags: true,
      },
    });
    
    // Transform trades to include analytics data
    const enhancedPaginatedTrades = paginatedTrades.map(enhanceTradeWithAnalysis);
    const allEnhancedFilteredTrades = allFilteredTrades.map(enhanceTradeWithAnalysis);
    
    // Calculate comprehensive performance statistics for filtered trades
    const statistics = calculatePerformanceStatistics(allEnhancedFilteredTrades);
    
    // Prepare response
    const result: AnalyticsResponse = {
      trades: enhancedPaginatedTrades,
      statistics,
      totalCount,
      filteredCount,
    };
    
    // Add comparison statistics if requested
    if (includeComparison && Object.keys(filters).length > 0) {
      // Get ALL user trades for baseline comparison
      const allUserTrades = await prisma.trade.findMany({
        where: { userId },
        include: {
          methodAnalysis: true,
          mindsetTags: true,
        },
      });
      
      const allEnhancedUserTrades = allUserTrades.map(enhanceTradeWithAnalysis);
      const baselineStatistics = calculatePerformanceStatistics(allEnhancedUserTrades);
      
      // Calculate improvement percentage (example: win rate improvement)
      const winRateImprovement = statistics.winRate - baselineStatistics.winRate;
      
      result.comparisonStats = {
        allTrades: baselineStatistics,
        filtered: statistics,
        improvement: winRateImprovement,
      };
    }
    
    res.json({
      success: true,
      data: result,
    });
    
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch analytics data',
    });
  }
});

// GET /api/analytics/statistics - Get performance statistics only (lightweight endpoint)
router.get('/statistics', requireAuth, async (req: AuthRequest, res: Response<{ 
  success: boolean; 
  data?: { 
    statistics: PerformanceStatistics; 
    significance?: any; 
    filteredCount: number; 
  }; 
  error?: string; 
}>) => {
  try {
    const userId = req.user!.id;
    
    // Parse and validate query parameters (same as main analytics endpoint)
    const queryValidation = QueryTradeAnalyticsFiltersSchema.safeParse(req.query);
    if (!queryValidation.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid query parameters',
      });
    }
    
    const filters = parseQueryFilters(req.query);
    const includeSignificance = req.query.includeSignificance === 'true';
    
    // Build where clause for filtered trades
    const filteredWhere = buildFilterQuery(filters, userId);
    
    // Get ALL filtered trades for statistics (no pagination for statistics)
    const allFilteredTrades = await prisma.trade.findMany({
      where: filteredWhere,
      include: {
        methodAnalysis: true,
        mindsetTags: true,
      },
    });
    
    // Transform trades to include analytics data
    const allEnhancedFilteredTrades = allFilteredTrades.map(enhanceTradeWithAnalysis);
    
    // Calculate comprehensive performance statistics
    const statistics = calculatePerformanceStatistics(allEnhancedFilteredTrades);
    
    // Prepare response
    const result: any = {
      statistics,
      filteredCount: allEnhancedFilteredTrades.length,
    };
    
    // Add statistical significance assessment if requested
    if (includeSignificance) {
      result.significance = assessStatisticalSignificance(allEnhancedFilteredTrades);
    }
    
    res.json({
      success: true,
      data: result,
    });
    
  } catch (error) {
    console.error('Error fetching performance statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch performance statistics',
    });
  }
});

// GET /api/analytics/presets - Get filter presets
router.get('/presets', requireAuth, async (req: AuthRequest, res: Response<{ success: boolean; data?: typeof DEFAULT_FILTER_PRESETS; error?: string }>) => {
  try {
    res.json({
      success: true,
      data: DEFAULT_FILTER_PRESETS,
    });
  } catch (error) {
    console.error('Error fetching filter presets:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch filter presets',
    });
  }
});

// GET /api/analytics/options - Get available filter options
router.get('/options', requireAuth, async (req: AuthRequest, res: Response<{ 
  success: boolean; 
  data?: {
    symbols: string[];
    indicators: IndicatorType[];
    signals: SignalType[];
    mindsetTags: MindsetTagType[];
  }; 
  error?: string; 
}>) => {
  try {
    const userId = req.user!.id;
    
    // Get unique symbols from user's trades
    const symbolsResult = await prisma.trade.findMany({
      where: { userId },
      select: { symbol: true },
      distinct: ['symbol'],
    });
    const symbols = symbolsResult.map(t => t.symbol).sort();
    
    // Get unique indicators from method analysis
    const indicatorsResult = await prisma.methodAnalysis.findMany({
      where: { trade: { userId } },
      select: { indicator: true },
      distinct: ['indicator'],
    });
    const indicators = indicatorsResult.map(m => m.indicator as IndicatorType).sort();
    
    // Get unique signals from method analysis
    const signalsResult = await prisma.methodAnalysis.findMany({
      where: { trade: { userId } },
      select: { signal: true },
      distinct: ['signal'],
    });
    const signals = signalsResult.map(m => m.signal as SignalType).sort();
    
    // Get unique mindset tags
    const mindsetTagsResult = await prisma.mindsetTag.findMany({
      where: { trade: { userId } },
      select: { tag: true },
      distinct: ['tag'],
    });
    const mindsetTags = mindsetTagsResult.map(m => m.tag as MindsetTagType).sort();
    
    res.json({
      success: true,
      data: {
        symbols,
        indicators,
        signals,
        mindsetTags,
      },
    });
  } catch (error) {
    console.error('Error fetching filter options:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch filter options',
    });
  }
});

export default router;