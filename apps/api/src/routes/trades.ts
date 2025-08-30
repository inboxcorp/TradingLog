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
  TradeStatus
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
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

// Validation schema for stop-loss adjustment
const AdjustStopLossRequestSchema = z.object({
  stopLoss: z.number().positive(),
});

// Helper function to format trade responses - reduces code duplication
const formatTradeResponse = (trade: any): Trade => ({
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
  createdAt: trade.createdAt,
  updatedAt: trade.updatedAt,
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
    const validationResult = CreateTradeRequestSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        message: validationResult.error.errors.map((e: any) => e.message).join(', ')
      });
    }
    
    const { symbol, direction, entryPrice, positionSize, stopLoss, notes } = validationResult.data;
    
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
        }
      });
      
      return trade;
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
          source: 'TRADE_CLOSE'
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

export default router;