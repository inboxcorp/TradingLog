import express, { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { 
  CreateTradeRequestSchema, 
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
  exceedsPortfolioRiskLimit 
} from '@trading-log/shared';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

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
    const formattedTrades: Trade[] = trades.map(trade => ({
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
      notes: trade.notes,
      createdAt: trade.createdAt,
      updatedAt: trade.updatedAt,
    }));

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
          notes: notes || null,
        }
      });
      
      return trade;
    });
    
    // Format response
    const formattedTrade: Trade = {
      id: result.id,
      userId: result.userId,
      symbol: result.symbol,
      direction: result.direction as TradeDirection,
      entryPrice: result.entryPrice,
      positionSize: result.positionSize,
      stopLoss: result.stopLoss,
      exitPrice: result.exitPrice,
      status: result.status as TradeStatus,
      entryDate: result.entryDate,
      exitDate: result.exitDate,
      realizedPnL: result.realizedPnL,
      riskAmount: result.riskAmount,
      notes: result.notes,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
    };
    
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

export default router;