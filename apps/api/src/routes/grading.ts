import express, { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import {
  TradeGrade,
  GradeLevel,
  TradeForGrading,
  RecalculateGradeRequestSchema,
  GradeAnalytics,
  calculateTradeGrade,
  calculateGradeAnalytics,
  generateCoachingRecommendations
} from '@trading-log/shared';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

/**
 * Helper function to create TradeForGrading object from Prisma trade
 */
const createTradeForGrading = (trade: any): TradeForGrading => {
  // Parse JSON fields
  const alignmentWarnings = trade.alignmentWarnings ? JSON.parse(trade.alignmentWarnings) : [];
  const alignmentConfirmations = trade.alignmentConfirmations ? JSON.parse(trade.alignmentConfirmations) : [];

  return {
    id: trade.id,
    userId: trade.userId,
    symbol: trade.symbol,
    direction: trade.direction as 'LONG' | 'SHORT',
    entryPrice: trade.entryPrice,
    positionSize: trade.positionSize,
    stopLoss: trade.stopLoss,
    exitPrice: trade.exitPrice,
    status: trade.status as 'ACTIVE' | 'CLOSED',
    entryDate: trade.entryDate,
    exitDate: trade.exitDate,
    realizedPnL: trade.realizedPnL,
    riskAmount: trade.riskAmount,
    riskPercentage: trade.riskPercentage,
    notes: trade.notes,
    createdAt: trade.createdAt,
    updatedAt: trade.updatedAt,
    user: {
      id: trade.user.id,
      email: trade.user.email,
      totalEquity: trade.user.totalEquity,
      createdAt: trade.user.createdAt,
      updatedAt: trade.user.updatedAt
    },
    methodAnalysis: trade.methodAnalysis || [],
    mindsetTags: trade.mindsetTags || [],
    alignmentAnalysis: trade.alignmentScore !== null ? {
      overallScore: trade.alignmentScore,
      alignmentLevel: trade.alignmentLevel as any,
      warnings: alignmentWarnings,
      confirmations: alignmentConfirmations,
      timeframeBreakdown: [] // Add required field as empty array
    } : undefined
  };
};

/**
 * Helper function to save grade to database
 */
const saveTradeGrade = async (tradeId: string, grade: TradeGrade, reason: string) => {
  return await prisma.$transaction(async (tx) => {
    // Update or create the current grade
    await tx.tradeGrade.upsert({
      where: { tradeId },
      update: {
        overall: grade.overall,
        score: grade.score,
        riskScore: grade.breakdown.riskManagement.score,
        alignmentScore: grade.breakdown.methodAlignment.score,
        mindsetScore: grade.breakdown.mindsetQuality.score,
        executionScore: grade.breakdown.execution.score,
        explanation: JSON.stringify(grade.explanation),
        recommendations: JSON.stringify(grade.recommendations),
        updatedAt: new Date()
      },
      create: {
        tradeId,
        overall: grade.overall,
        score: grade.score,
        riskScore: grade.breakdown.riskManagement.score,
        alignmentScore: grade.breakdown.methodAlignment.score,
        mindsetScore: grade.breakdown.mindsetQuality.score,
        executionScore: grade.breakdown.execution.score,
        explanation: JSON.stringify(grade.explanation),
        recommendations: JSON.stringify(grade.recommendations)
      }
    });

    // Add to grade history
    await tx.gradeHistory.create({
      data: {
        tradeId,
        grade: grade.overall,
        score: grade.score,
        reason,
        calculatedAt: new Date()
      }
    });
  });
};

/**
 * Calculate and save grade for a trade
 */
export const calculateAndSaveGrade = async (
  tradeId: string, 
  reason: 'TRADE_CLOSE' | 'ANALYSIS_UPDATE' | 'MINDSET_UPDATE' | 'MANUAL_RECALC'
): Promise<TradeGrade> => {
  // Get trade with all related data
  const trade = await prisma.trade.findUnique({
    where: { id: tradeId },
    include: {
      user: true,
      methodAnalysis: true,
      mindsetTags: true
    }
  });

  if (!trade) {
    throw new Error('Trade not found');
  }

  // Create TradeForGrading object
  const tradeForGrading = createTradeForGrading(trade);

  // Calculate grade
  const grade = calculateTradeGrade(tradeForGrading);

  // Save to database
  await saveTradeGrade(tradeId, grade, reason);

  return grade;
};

// POST /api/grading/:tradeId/calculate - Calculate grade for a specific trade
router.post('/:tradeId/calculate', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { tradeId } = req.params;

    // Validate request body
    const validationResult = RecalculateGradeRequestSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        message: validationResult.error.errors.map(e => e.message).join(', ')
      });
    }

    const { reason } = validationResult.data;

    // Verify trade belongs to user
    const trade = await prisma.trade.findFirst({
      where: { id: tradeId, userId }
    });

    if (!trade) {
      return res.status(404).json({
        success: false,
        error: 'Trade not found'
      });
    }

    // Calculate and save grade
    const grade = await calculateAndSaveGrade(tradeId, reason);

    res.json({
      success: true,
      data: grade
    });

  } catch (error) {
    console.error('Error calculating trade grade:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate trade grade',
      message: process.env.NODE_ENV === 'development' ? 
        (error instanceof Error ? error.message : String(error)) : 
        undefined
    });
  }
});

// GET /api/grading/:tradeId - Get grade for a specific trade
router.get('/:tradeId', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { tradeId } = req.params;

    // Verify trade belongs to user and get grade
    const trade = await prisma.trade.findFirst({
      where: { id: tradeId, userId },
      include: {
        tradeGrade: true,
        gradeHistory: {
          orderBy: { calculatedAt: 'desc' },
          take: 10 // Last 10 grade calculations
        }
      }
    });

    if (!trade) {
      return res.status(404).json({
        success: false,
        error: 'Trade not found'
      });
    }

    if (!trade.tradeGrade) {
      return res.status(404).json({
        success: false,
        error: 'No grade found for this trade'
      });
    }

    // Format response
    const gradeResponse: TradeGrade & { history?: any[] } = {
      overall: trade.tradeGrade.overall as GradeLevel,
      score: trade.tradeGrade.score,
      breakdown: {
        riskManagement: {
          score: trade.tradeGrade.riskScore,
          weight: 0.35,
          factors: [],
          improvements: []
        },
        methodAlignment: {
          score: trade.tradeGrade.alignmentScore,
          weight: 0.30,
          factors: [],
          improvements: []
        },
        mindsetQuality: {
          score: trade.tradeGrade.mindsetScore,
          weight: 0.25,
          factors: [],
          improvements: []
        },
        execution: {
          score: trade.tradeGrade.executionScore,
          weight: 0.10,
          factors: [],
          improvements: []
        }
      },
      explanation: JSON.parse(trade.tradeGrade.explanation),
      recommendations: JSON.parse(trade.tradeGrade.recommendations),
      history: trade.gradeHistory
    };

    res.json({
      success: true,
      data: gradeResponse
    });

  } catch (error) {
    console.error('Error getting trade grade:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get trade grade'
    });
  }
});

// GET /api/grading/analytics - Get grade analytics for user
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { timeRange = 'all' } = req.query;

    // Build date filter based on time range
    let dateFilter = {};
    const now = new Date();
    
    switch (timeRange) {
      case 'week':
        dateFilter = { 
          calculatedAt: { 
            gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) 
          } 
        };
        break;
      case 'month':
        dateFilter = { 
          calculatedAt: { 
            gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) 
          } 
        };
        break;
      case 'quarter':
        dateFilter = { 
          calculatedAt: { 
            gte: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000) 
          } 
        };
        break;
      case 'year':
        dateFilter = { 
          calculatedAt: { 
            gte: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000) 
          } 
        };
        break;
      default:
        // All time - no filter
        break;
    }

    // Get grades for user's trades
    const trades = await prisma.trade.findMany({
      where: { userId },
      include: {
        tradeGrade: {
          where: dateFilter
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Filter trades that have grades and format for analytics
    const gradesOverTime = trades
      .filter(trade => trade.tradeGrade)
      .map(trade => ({
        grade: {
          overall: trade.tradeGrade!.overall as GradeLevel,
          score: trade.tradeGrade!.score,
          breakdown: {
            riskManagement: {
              score: trade.tradeGrade!.riskScore,
              weight: 0.35,
              factors: [],
              improvements: []
            },
            methodAlignment: {
              score: trade.tradeGrade!.alignmentScore,
              weight: 0.30,
              factors: [],
              improvements: []
            },
            mindsetQuality: {
              score: trade.tradeGrade!.mindsetScore,
              weight: 0.25,
              factors: [],
              improvements: []
            },
            execution: {
              score: trade.tradeGrade!.executionScore,
              weight: 0.10,
              factors: [],
              improvements: []
            }
          },
          explanation: JSON.parse(trade.tradeGrade!.explanation),
          recommendations: JSON.parse(trade.tradeGrade!.recommendations)
        },
        date: trade.tradeGrade!.calculatedAt,
        outcome: trade.realizedPnL || undefined
      }));

    // Calculate analytics
    const analytics = calculateGradeAnalytics(gradesOverTime);

    // Generate coaching recommendations
    const recentGrades = gradesOverTime
      .slice(0, 10)
      .map(g => g.grade);
    
    const coachingRecommendations = generateCoachingRecommendations(recentGrades);

    res.json({
      success: true,
      data: {
        analytics,
        coachingRecommendations,
        totalTrades: gradesOverTime.length
      }
    });

  } catch (error) {
    console.error('Error getting grade analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get grade analytics'
    });
  }
});

export default router;