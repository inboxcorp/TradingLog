import express, { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { 
  CreateTradeRequestSchema,
  CloseTradeRequestSchema,
  TradeResponse, 
  TradesResponse,
  Trade,
  TradeDirection,
  TradeStatus,
  CreateMethodAnalysisSchema,
  UpdateMethodAnalysisSchema,
  validateMethodAnalysis,
  MethodAnalysis,
  MindsetTagType,
  IntensityLevel,
  CreateMindsetTagRequestSchema,
  UpdateMindsetTagRequestSchema,
  analyzeAlignment,
  AlignmentAnalysis
} from '@trading-log/shared';
import { 
  calculateTradeRisk, 
  calculatePortfolioRisk, 
  exceedsIndividualRiskLimit, 
  exceedsPortfolioRiskLimit,
  calculateRealizedPnL,
  updateEquity,
  validateStopLossAdjustment,
  recalculateTradeRisk,
  calculateNewRiskPercentage
} from '@trading-log/shared';
import { calculateAndSaveGrade } from './grading';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

// Validation schema for stop-loss adjustment
const AdjustStopLossRequestSchema = z.object({
  stopLoss: z.number().positive(),
});

// Enhanced create trade request schema with method analysis and mindset tags
const CreateTradeWithAnalysisRequestSchema = CreateTradeRequestSchema.extend({
  methodAnalysis: z.array(CreateMethodAnalysisSchema).optional(),
  mindsetTags: z.array(CreateMindsetTagRequestSchema).optional(),
});

// Helper function to format trade responses - reduces code duplication
// Uses object spread to maintain all fields while ensuring type safety for enums
const formatTradeResponse = (trade: any): Trade => ({
  ...trade,
  direction: trade.direction as TradeDirection,
  status: trade.status as TradeStatus,
  alignmentScore: trade.alignmentScore,
  alignmentLevel: trade.alignmentLevel,
  alignmentWarnings: trade.alignmentWarnings,
  alignmentConfirmations: trade.alignmentConfirmations,
});

// GET /api/trades - Get user's trades with filtering
router.get('/', requireAuth, async (req: AuthRequest, res: Response<TradesResponse>) => {
  try {
    const userId = req.user!.id;
    const { status } = req.query;
    
    // Validate status parameter
    const statusFilter = status === 'ACTIVE' || status === 'CLOSED' ? status : undefined;
    
    const trades = await prisma.trade.findMany({
      where: {
        userId,
        ...(statusFilter && { status: statusFilter })
      },
      include: {
        methodAnalysis: true,
        mindsetTags: true,
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Transform Prisma result to match our Trade interface
    const formattedTrades: Trade[] = trades.map(formatTradeResponse);

    res.json({
      success: true,
      data: formattedTrades
    });
  } catch (error) {
    console.error('Error fetching trades:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch trades'
    });
  }
});

// POST /api/trades - Create new trade with risk validation
router.post('/', requireAuth, async (req: AuthRequest, res: Response<TradeResponse>) => {
  try {
    const userId = req.user!.id;
    
    // Validate request body
    const validationResult = CreateTradeWithAnalysisRequestSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        message: validationResult.error.errors.map((e: any) => e.message).join(', ')
      });
    }
    
    const { symbol, direction, entryPrice, positionSize, stopLoss, notes, methodAnalysis, mindsetTags } = validationResult.data;
    
    // Validate method analysis if provided
    if (methodAnalysis && methodAnalysis.length > 0) {
      const analysisValidation = validateMethodAnalysis(methodAnalysis);
      if (!analysisValidation.isValid) {
        return res.status(400).json({
          success: false,
          error: 'Invalid method analysis',
          message: analysisValidation.error
        });
      }
    }
    
    // Validate mindset tags if provided
    if (mindsetTags && mindsetTags.length > 0) {
      // Check for duplicate tags
      const tagTypes = mindsetTags.map(tag => tag.tag);
      const uniqueTags = new Set(tagTypes);
      if (tagTypes.length !== uniqueTags.size) {
        return res.status(400).json({
          success: false,
          error: 'Invalid mindset tags',
          message: 'Duplicate mindset tags are not allowed'
        });
      }
      
      // Check for maximum tags (optional limit)
      if (mindsetTags.length > 5) {
        return res.status(400).json({
          success: false,
          error: 'Invalid mindset tags',
          message: 'Maximum of 5 mindset tags allowed per trade'
        });
      }
    }
    
    // Calculate trade risk
    const riskAmount = calculateTradeRisk(entryPrice, stopLoss, positionSize);
    
    // Use database transaction for risk validation and trade creation
    const result = await prisma.$transaction(async (tx) => {
      // Get user's current equity and active trades
      const [user, activeTrades] = await Promise.all([
        tx.user.findUnique({ where: { id: userId } }),
        tx.trade.findMany({ 
          where: { userId, status: 'ACTIVE' },
          select: { riskAmount: true, status: true }
        })
      ]);
      
      if (!user) {
        throw new Error('User not found');
      }
      
      // Calculate risk percentage at time of entry
      const riskPercentage = (riskAmount / user.totalEquity) * 100;
      
      // Validate individual trade risk (2% limit)
      if (exceedsIndividualRiskLimit(riskAmount, user.totalEquity)) {
        throw new Error(`Trade risk ($${riskAmount.toFixed(2)}) exceeds 2% limit ($${(user.totalEquity * 0.02).toFixed(2)})`);
      }
      
      // Calculate current portfolio risk
      const currentPortfolioRisk = calculatePortfolioRisk(activeTrades);
      const newPortfolioRisk = currentPortfolioRisk + riskAmount;
      
      // Validate portfolio risk (6% limit)
      if (exceedsPortfolioRiskLimit(newPortfolioRisk, user.totalEquity)) {
        throw new Error(`Total portfolio risk ($${newPortfolioRisk.toFixed(2)}) would exceed 6% limit ($${(user.totalEquity * 0.06).toFixed(2)})`);
      }
      
      // Calculate alignment analysis if method analysis is provided
      let alignmentAnalysis: AlignmentAnalysis | null = null;
      if (methodAnalysis && methodAnalysis.length > 0) {
        // Convert request data to MethodAnalysis format for alignment calculation
        const analysisForAlignment = methodAnalysis.map((analysis, index) => ({
          id: `temp-${index}`, // Temporary ID for calculation
          tradeId: 'temp', // Temporary trade ID
          timeframe: analysis.timeframe,
          indicator: analysis.indicator,
          signal: analysis.signal,
          divergence: analysis.divergence,
          notes: analysis.notes || null,
          createdAt: new Date(),
          updatedAt: new Date(),
        })) as MethodAnalysis[];

        alignmentAnalysis = analyzeAlignment(direction, analysisForAlignment);
      }

      // Create the trade
      const trade = await tx.trade.create({
        data: {
          userId,
          symbol,
          direction,
          entryPrice,
          positionSize,
          stopLoss,
          status: 'ACTIVE',
          entryDate: new Date(),
          riskAmount,
          riskPercentage,
          notes: notes || null,
          // Add alignment fields
          alignmentScore: alignmentAnalysis?.overallScore || null,
          alignmentLevel: alignmentAnalysis?.alignmentLevel || null,
          alignmentWarnings: alignmentAnalysis?.warnings ? JSON.stringify(alignmentAnalysis.warnings) : null,
          alignmentConfirmations: alignmentAnalysis?.confirmations ? JSON.stringify(alignmentAnalysis.confirmations) : null,
        }
      });
      
      // Create method analysis if provided
      if (methodAnalysis && methodAnalysis.length > 0) {
        await tx.methodAnalysis.createMany({
          data: methodAnalysis.map(analysis => ({
            tradeId: trade.id,
            timeframe: analysis.timeframe,
            indicator: analysis.indicator,
            signal: analysis.signal,
            divergence: analysis.divergence,
            notes: analysis.notes || null,
          }))
        });
      }
      
      // Create mindset tags if provided
      if (mindsetTags && mindsetTags.length > 0) {
        await tx.mindsetTag.createMany({
          data: mindsetTags.map(mindsetTag => ({
            tradeId: trade.id,
            tag: mindsetTag.tag,
            intensity: mindsetTag.intensity || 'MEDIUM',
          }))
        });
      }
      
      // Return trade with analysis
      return await tx.trade.findUnique({
        where: { id: trade.id },
        include: {
          methodAnalysis: true,
          mindsetTags: true,
        }
      });
    });
    
    const formattedTrade = formatTradeResponse(result);
    
    res.status(201).json({
      success: true,
      data: formattedTrade
    });
    
  } catch (error) {
    console.error('Error creating trade:', error);
    
    // Handle specific risk validation errors
    if (error instanceof Error && error.message.includes('exceeds')) {
      return res.status(400).json({
        success: false,
        error: 'Risk limit exceeded',
        message: error.message
      });
    }
    
    // Handle user not found error
    if (error instanceof Error && error.message === 'User not found') {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        message: 'The authenticated user does not exist in the database'
      });
    }
    
    // Handle Prisma validation errors
    if (error instanceof Error && error.name === 'PrismaClientValidationError') {
      return res.status(400).json({
        success: false,
        error: 'Invalid data format',
        message: 'The provided data does not match the expected format'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to create trade',
      message: process.env.NODE_ENV === 'development' ? error instanceof Error ? error.message : String(error) : undefined
    });
  }
});

// POST /api/trades/:tradeId/close - Close an active trade
router.post('/:tradeId/close', requireAuth, async (req: AuthRequest, res: Response<TradeResponse>) => {
  try {
    const userId = req.user!.id;
    const { tradeId } = req.params;
    
    // Validate request body
    const validationResult = CloseTradeRequestSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        message: validationResult.error.errors.map((e: any) => e.message).join(', ')
      });
    }
    
    const { exitPrice } = validationResult.data;
    
    // Additional business validation for exit price
    if (exitPrice <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid exit price',
        message: 'Exit price must be greater than zero'
      });
    }
    
    // Use database transaction for trade closing and equity updates
    const result = await prisma.$transaction(async (tx) => {
      // Get the trade to close
      const trade = await tx.trade.findFirst({
        where: { 
          id: tradeId,
          userId,
          status: 'ACTIVE' // Only allow closing active trades
        }
      });
      
      if (!trade) {
        throw new Error('Trade not found or already closed');
      }
      
      // Get user's current equity
      const user = await tx.user.findUnique({ 
        where: { id: userId } 
      });
      
      if (!user) {
        throw new Error('User not found');
      }
      
      // Calculate realized P/L
      const realizedPnL = calculateRealizedPnL(
        trade.entryPrice,
        exitPrice,
        trade.positionSize,
        trade.direction as 'LONG' | 'SHORT'
      );
      
      // Update user equity
      const newEquity = updateEquity(user.totalEquity, realizedPnL);
      
      // Update user's total equity
      await tx.user.update({
        where: { id: userId },
        data: { totalEquity: newEquity }
      });
      
      // Create equity snapshot for historical tracking
      await tx.equitySnapshot.create({
        data: {
          userId,
          totalEquity: newEquity,
          timestamp: new Date(),
          source: 'TRADE_CLOSE',
          amount: realizedPnL,
          description: `Trade closed: ${trade.symbol} ${trade.direction} - P/L: ${realizedPnL >= 0 ? '+' : ''}${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(realizedPnL)}`
        }
      });
      
      // Update the trade with exit information
      const updatedTrade = await tx.trade.update({
        where: { id: tradeId },
        data: {
          status: 'CLOSED',
          exitPrice,
          exitDate: new Date(),
          realizedPnL,
          updatedAt: new Date()
        }
      });
      
      return updatedTrade;
    });
    
    // Calculate and save trade grade after closing
    try {
      await calculateAndSaveGrade(tradeId, 'TRADE_CLOSE');
    } catch (gradingError) {
      // Log error but don't fail the trade closure
      console.error('Error calculating grade for closed trade:', gradingError);
    }
    
    const formattedTrade = formatTradeResponse(result);
    
    res.json({
      success: true,
      data: formattedTrade
    });
    
  } catch (error) {
    console.error('Error closing trade:', error);
    
    // Handle specific error cases
    if (error instanceof Error && (error.message.includes('not found') || error.message.includes('already closed'))) {
      return res.status(404).json({
        success: false,
        error: 'Trade not found',
        message: error.message
      });
    }
    
    // Handle Prisma validation errors
    if (error instanceof Error && error.name === 'PrismaClientValidationError') {
      return res.status(400).json({
        success: false,
        error: 'Invalid data format',
        message: 'The provided data does not match the expected format'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to close trade',
      message: process.env.NODE_ENV === 'development' ? error instanceof Error ? error.message : String(error) : undefined
    });
  }
});

// PATCH /api/trades/:tradeId - Adjust stop-loss on active trade
router.patch('/:tradeId', requireAuth, async (req: AuthRequest, res: Response<TradeResponse>) => {
  try {
    const userId = req.user!.id;
    const { tradeId } = req.params;
    
    // Validate request body
    const validationResult = AdjustStopLossRequestSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        message: validationResult.error.errors.map((e: any) => e.message).join(', ')
      });
    }
    
    const { stopLoss: newStopLoss } = validationResult.data;
    
    // Use database transaction for stop-loss adjustment
    const result = await prisma.$transaction(async (tx) => {
      // Get the trade to adjust
      const trade = await tx.trade.findFirst({
        where: { 
          id: tradeId,
          userId,
          status: 'ACTIVE' // Only allow adjusting active trades
        }
      });
      
      if (!trade) {
        throw new Error('Trade not found or not active');
      }
      
      // Get user's current equity for risk percentage calculation
      const user = await tx.user.findUnique({ 
        where: { id: userId } 
      });
      
      if (!user) {
        throw new Error('User not found');
      }
      
      // Format trade for validation
      const tradeForValidation: Trade = {
        id: trade.id,
        userId: trade.userId,
        symbol: trade.symbol,
        direction: trade.direction as TradeDirection,
        entryPrice: trade.entryPrice,
        positionSize: trade.positionSize,
        stopLoss: trade.stopLoss,
        exitPrice: trade.exitPrice,
        status: trade.status as TradeStatus,
        entryDate: trade.entryDate,
        exitDate: trade.exitDate,
        realizedPnL: trade.realizedPnL,
        riskAmount: trade.riskAmount,
        riskPercentage: trade.riskPercentage,
        notes: trade.notes,
        alignmentScore: trade.alignmentScore,
        alignmentLevel: trade.alignmentLevel,
        alignmentWarnings: trade.alignmentWarnings,
        alignmentConfirmations: trade.alignmentConfirmations,
        createdAt: trade.createdAt,
        updatedAt: trade.updatedAt,
      };
      
      // Validate stop-loss adjustment direction
      const validation = validateStopLossAdjustment(tradeForValidation, newStopLoss);
      if (!validation.isValid) {
        throw new Error(validation.error);
      }
      
      // Recalculate risk with new stop-loss
      const newRiskAmount = recalculateTradeRisk(tradeForValidation, newStopLoss);
      const newRiskPercentage = calculateNewRiskPercentage(newRiskAmount, user.totalEquity);
      
      // Update the trade with new stop-loss and recalculated risk
      const updatedTrade = await tx.trade.update({
        where: { id: tradeId },
        data: {
          stopLoss: newStopLoss,
          riskAmount: newRiskAmount,
          riskPercentage: newRiskPercentage,
          updatedAt: new Date()
        }
      });
      
      return updatedTrade;
    });
    
    const formattedTrade = formatTradeResponse(result);
    
    res.json({
      success: true,
      data: formattedTrade
    });
    
  } catch (error) {
    console.error('Error adjusting stop-loss:', error);
    
    // Handle specific error cases
    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: 'Trade not found',
        message: error.message
      });
    }
    
    // Handle validation errors
    if (error instanceof Error && (
        error.message.includes('must be higher') || 
        error.message.includes('must be lower') ||
        error.message.includes('positive number')
      )) {
      return res.status(400).json({
        success: false,
        error: 'Stop-loss adjustment validation failed',
        message: error.message
      });
    }
    
    // Handle Prisma validation errors
    if (error instanceof Error && error.name === 'PrismaClientValidationError') {
      return res.status(400).json({
        success: false,
        error: 'Invalid data format',
        message: 'The provided data does not match the expected format'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to adjust stop-loss',
      message: process.env.NODE_ENV === 'development' ? error instanceof Error ? error.message : String(error) : undefined
    });
  }
});

// PATCH /api/trades/:tradeId/analysis - Update method analysis for a trade
router.patch('/:tradeId/analysis', requireAuth, async (req: AuthRequest, res: Response<TradeResponse>) => {
  try {
    const userId = req.user!.id;
    const { tradeId } = req.params;
    
    // Validate request body - expecting array of analysis updates
    const analysisArraySchema = z.array(CreateMethodAnalysisSchema);
    const validationResult = analysisArraySchema.safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        message: validationResult.error.errors.map((e: any) => e.message).join(', ')
      });
    }
    
    const analysisUpdates = validationResult.data;
    
    // Validate method analysis
    const analysisValidation = validateMethodAnalysis(analysisUpdates);
    if (!analysisValidation.isValid) {
      return res.status(400).json({
        success: false,
        error: 'Invalid method analysis',
        message: analysisValidation.error
      });
    }
    
    // Use database transaction for analysis update
    const result = await prisma.$transaction(async (tx) => {
      // Verify trade exists and belongs to user
      const trade = await tx.trade.findFirst({
        where: { 
          id: tradeId,
          userId
        }
      });
      
      if (!trade) {
        throw new Error('Trade not found');
      }
      
      // Delete existing analysis for this trade
      await tx.methodAnalysis.deleteMany({
        where: { tradeId }
      });
      
      // Create new analysis records and recalculate alignment
      if (analysisUpdates.length > 0) {
        await tx.methodAnalysis.createMany({
          data: analysisUpdates.map(analysis => ({
            tradeId,
            timeframe: analysis.timeframe,
            indicator: analysis.indicator,
            signal: analysis.signal,
            divergence: analysis.divergence,
            notes: analysis.notes || null,
          }))
        });

        // Recalculate alignment analysis
        const analysisForAlignment = analysisUpdates.map((analysis, index) => ({
          id: `temp-${index}`, // Temporary ID for calculation
          tradeId: tradeId, // Use actual trade ID
          timeframe: analysis.timeframe,
          indicator: analysis.indicator,
          signal: analysis.signal,
          divergence: analysis.divergence,
          notes: analysis.notes || null,
          createdAt: new Date(),
          updatedAt: new Date(),
        })) as MethodAnalysis[];

        const alignmentAnalysis = analyzeAlignment(trade.direction as TradeDirection, analysisForAlignment);

        // Update trade with new alignment analysis
        await tx.trade.update({
          where: { id: tradeId },
          data: {
            alignmentScore: alignmentAnalysis.overallScore,
            alignmentLevel: alignmentAnalysis.alignmentLevel,
            alignmentWarnings: JSON.stringify(alignmentAnalysis.warnings),
            alignmentConfirmations: JSON.stringify(alignmentAnalysis.confirmations),
          }
        });
      } else {
        // Clear alignment analysis if no method analysis
        await tx.trade.update({
          where: { id: tradeId },
          data: {
            alignmentScore: null,
            alignmentLevel: null,
            alignmentWarnings: null,
            alignmentConfirmations: null,
          }
        });
      }
      
      // Return updated trade with analysis
      return await tx.trade.findUnique({
        where: { id: tradeId },
        include: {
          methodAnalysis: true,
          mindsetTags: true,
        }
      });
    });
    
    if (!result) {
      return res.status(404).json({
        success: false,
        error: 'Trade not found'
      });
    }
    
    // Recalculate trade grade after analysis update
    try {
      await calculateAndSaveGrade(tradeId, 'ANALYSIS_UPDATE');
    } catch (gradingError) {
      // Log error but don't fail the analysis update
      console.error('Error recalculating grade after analysis update:', gradingError);
    }
    
    const formattedTrade = formatTradeResponse(result);
    
    res.json({
      success: true,
      data: formattedTrade
    });
    
  } catch (error) {
    console.error('Error updating method analysis:', error);
    
    // Handle specific error cases
    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: 'Trade not found',
        message: error.message
      });
    }
    
    // Handle Prisma validation errors
    if (error instanceof Error && error.name === 'PrismaClientValidationError') {
      return res.status(400).json({
        success: false,
        error: 'Invalid data format',
        message: 'The provided data does not match the expected format'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to update method analysis',
      message: process.env.NODE_ENV === 'development' ? error instanceof Error ? error.message : String(error) : undefined
    });
  }
});

// PATCH /api/trades/:tradeId/mindset - Update mindset tags for a trade
router.patch('/:tradeId/mindset', requireAuth, async (req: AuthRequest, res: Response<TradeResponse>) => {
  try {
    const userId = req.user!.id;
    const { tradeId } = req.params;
    
    // Validate request body
    const validationResult = UpdateMindsetTagRequestSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        message: validationResult.error.errors.map((e: any) => e.message).join(', ')
      });
    }
    
    const { tags: mindsetTags } = validationResult.data;
    
    // Validate mindset tags
    if (mindsetTags.length > 0) {
      // Check for duplicate tags
      const tagTypes = mindsetTags.map(tag => tag.tag);
      const uniqueTags = new Set(tagTypes);
      if (tagTypes.length !== uniqueTags.size) {
        return res.status(400).json({
          success: false,
          error: 'Invalid mindset tags',
          message: 'Duplicate mindset tags are not allowed'
        });
      }
      
      // Check for maximum tags
      if (mindsetTags.length > 5) {
        return res.status(400).json({
          success: false,
          error: 'Invalid mindset tags',
          message: 'Maximum of 5 mindset tags allowed per trade'
        });
      }
    }
    
    // Use database transaction for mindset tag update
    const result = await prisma.$transaction(async (tx) => {
      // Verify trade exists and belongs to user
      const trade = await tx.trade.findFirst({
        where: { 
          id: tradeId,
          userId
        }
      });
      
      if (!trade) {
        throw new Error('Trade not found');
      }
      
      // Delete existing mindset tags for this trade
      await tx.mindsetTag.deleteMany({
        where: { tradeId }
      });
      
      // Create new mindset tag records
      if (mindsetTags.length > 0) {
        await tx.mindsetTag.createMany({
          data: mindsetTags.map(mindsetTag => ({
            tradeId,
            tag: mindsetTag.tag,
            intensity: mindsetTag.intensity,
          }))
        });
      }
      
      // Return updated trade with mindset tags
      return await tx.trade.findUnique({
        where: { id: tradeId },
        include: {
          methodAnalysis: true,
          mindsetTags: true,
        }
      });
    });
    
    if (!result) {
      return res.status(404).json({
        success: false,
        error: 'Trade not found'
      });
    }
    
    // Recalculate trade grade after mindset update
    try {
      await calculateAndSaveGrade(tradeId, 'MINDSET_UPDATE');
    } catch (gradingError) {
      // Log error but don't fail the mindset update
      console.error('Error recalculating grade after mindset update:', gradingError);
    }
    
    const formattedTrade = formatTradeResponse(result);
    
    res.json({
      success: true,
      data: formattedTrade
    });
    
  } catch (error) {
    console.error('Error updating mindset tags:', error);
    
    // Handle specific error cases
    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: 'Trade not found',
        message: error.message
      });
    }
    
    // Handle Prisma validation errors
    if (error instanceof Error && error.name === 'PrismaClientValidationError') {
      return res.status(400).json({
        success: false,
        error: 'Invalid data format',
        message: 'The provided data does not match the expected format'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to update mindset tags',
      message: process.env.NODE_ENV === 'development' ? error instanceof Error ? error.message : String(error) : undefined
    });
  }
});

export default router;