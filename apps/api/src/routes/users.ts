import express from 'express';
import { PrismaClient } from '@prisma/client';
import { 
  UpdateUserEquityRequestSchema, 
  UserResponse, 
  PortfolioRiskResponse,
  CashAdjustmentRequestSchema,
  CashAdjustmentResponse,
  CashHistoryResponse,
  CashHistoryEntry
} from '@trading-log/shared';
import { AuthRequest, authenticateToken } from '../middleware/auth';
import { 
  updateEquity, 
  validateEquityValue, 
  calculateDetailedPortfolioRisk,
  processCashAdjustment,
  validateCashAdjustmentAmount
} from '@trading-log/shared';
import Decimal from 'decimal.js';

const router = express.Router();
const prisma = new PrismaClient();

/**
 * GET /api/user
 * Retrieve current user profile data
 */
router.get('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    
    let user = await prisma.user.findUnique({
      where: { id: userId },
    });

    // Create user if doesn't exist (for development)
    if (!user) {
      user = await prisma.user.create({
        data: {
          id: userId,
          email: 'dev@example.com',
          totalEquity: 10000, // Default $10,000 starting equity
        },
      });
    }

    const response: UserResponse = {
      success: true,
      data: user,
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user data',
      ...(process.env.NODE_ENV === 'development' && { details: error instanceof Error ? error.message : String(error) }),
    });
  }
});

/**
 * PATCH /api/user
 * Update user equity value
 */
router.patch('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    
    // Validate request body
    const validation = UpdateUserEquityRequestSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: validation.error.errors,
      });
      return;
    }

    const { totalEquity } = validation.data;

    // Additional equity validation
    if (!validateEquityValue(totalEquity)) {
      res.status(400).json({
        success: false,
        error: 'Invalid equity value. Must be positive and within reasonable limits.',
      });
      return;
    }

    // Use Decimal.js for precise monetary calculations
    const preciseEquity = new Decimal(totalEquity).toNumber();

    const user = await prisma.user.upsert({
      where: { id: userId },
      update: { totalEquity: preciseEquity },
      create: {
        id: userId,
        email: 'dev@example.com',
        totalEquity: preciseEquity,
      },
    });

    const response: UserResponse = {
      success: true,
      data: user,
      message: 'Equity updated successfully',
    };

    res.json(response);
  } catch (error) {
    console.error('Error updating user equity:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update equity',
      ...(process.env.NODE_ENV === 'development' && { details: error instanceof Error ? error.message : String(error) }),
    });
  }
});

/**
 * GET /api/user/portfolio-risk
 * Get current portfolio risk calculation
 */
router.get('/portfolio-risk', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    
    // Get user and active trades in parallel
    const [user, activeTrades] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.trade.findMany({
        where: { 
          userId,
          status: 'ACTIVE'
        },
        select: {
          id: true,
          symbol: true,
          riskAmount: true
        }
      })
    ]);

    if (!user) {
      res.status(404).json({
        success: false,
        error: 'User not found'
      });
      return;
    }

    // Calculate detailed portfolio risk
    const portfolioRisk = calculateDetailedPortfolioRisk(activeTrades, user.totalEquity);

    const response: PortfolioRiskResponse = {
      success: true,
      data: {
        ...portfolioRisk,
        userEquity: user.totalEquity
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Error calculating portfolio risk:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate portfolio risk',
      ...(process.env.NODE_ENV === 'development' && { details: error instanceof Error ? error.message : String(error) })
    });
  }
});

/**
 * POST /api/user/cash-adjustment
 * Process cash deposit or withdrawal
 */
router.post('/cash-adjustment', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    
    // Validate request body
    const validation = CashAdjustmentRequestSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: validation.error.errors,
      });
      return;
    }

    const { type, amount, description } = validation.data;

    // Additional amount validation
    if (!validateCashAdjustmentAmount(amount)) {
      res.status(400).json({
        success: false,
        error: 'Invalid adjustment amount. Must be positive and within reasonable limits.',
      });
      return;
    }

    // Get current user
    const currentUser = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!currentUser) {
      res.status(404).json({
        success: false,
        error: 'User not found'
      });
      return;
    }

    // Process the adjustment using transaction for atomicity
    const result = await prisma.$transaction(async (tx) => {
      // Calculate new equity
      const newEquity = processCashAdjustment(currentUser.totalEquity, type, amount);
      
      // Update user equity
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: { totalEquity: newEquity }
      });

      // Create equity snapshot for audit trail
      const adjustmentAmount = type === 'DEPOSIT' ? amount : -amount;
      const source = type === 'DEPOSIT' ? 'CASH_DEPOSIT' : 'CASH_WITHDRAWAL';
      
      await tx.equitySnapshot.create({
        data: {
          userId,
          totalEquity: newEquity,
          source,
          amount: adjustmentAmount,
          description: description || `${type.toLowerCase()} of ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)}`
        }
      });

      return updatedUser;
    });

    const response: CashAdjustmentResponse = {
      success: true,
      data: result,
      message: `${type.toLowerCase()} of ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)} processed successfully`
    };

    res.json(response);
  } catch (error) {
    console.error('Error processing cash adjustment:', error);
    
    // Handle specific business logic errors
    if (error instanceof Error) {
      if (error.message.includes('Insufficient funds')) {
        res.status(400).json({
          success: false,
          error: 'Insufficient funds for withdrawal'
        });
        return;
      }
      if (error.message.includes('Invalid adjustment amount')) {
        res.status(400).json({
          success: false,
          error: 'Invalid adjustment amount'
        });
        return;
      }
    }

    res.status(500).json({
      success: false,
      error: 'Failed to process cash adjustment',
      ...(process.env.NODE_ENV === 'development' && { details: error instanceof Error ? error.message : String(error) }),
    });
  }
});

/**
 * GET /api/user/cash-history
 * Retrieve cash adjustment history
 */
router.get('/cash-history', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const skip = (page - 1) * limit;

    // Get cash adjustment history from equity snapshots
    const snapshots = await prisma.equitySnapshot.findMany({
      where: { 
        userId,
        source: {
          in: ['CASH_DEPOSIT', 'CASH_WITHDRAWAL', 'TRADE_CLOSE']
        }
      },
      orderBy: { timestamp: 'desc' },
      skip,
      take: limit
    });

    // Transform to cash history entries
    const history: CashHistoryEntry[] = snapshots.map(snapshot => ({
      id: snapshot.id,
      timestamp: snapshot.timestamp,
      type: snapshot.source === 'CASH_DEPOSIT' ? 'DEPOSIT' : 
            snapshot.source === 'CASH_WITHDRAWAL' ? 'WITHDRAWAL' : 'TRADE_PNL',
      amount: snapshot.amount || 0,
      description: snapshot.description || undefined,
      totalEquityAfter: snapshot.totalEquity
    }));

    const response: CashHistoryResponse = {
      success: true,
      data: history
    };

    res.json(response);
  } catch (error) {
    console.error('Error retrieving cash history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve cash history',
      ...(process.env.NODE_ENV === 'development' && { details: error instanceof Error ? error.message : String(error) })
    });
  }
});

export default router;