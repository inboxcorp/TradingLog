import express from 'express';
import { PrismaClient } from '@prisma/client';
import { UpdateUserEquityRequestSchema, UserResponse } from '@trading-log/shared';
import { AuthRequest, authenticateToken } from '../middleware/auth.js';
import { updateEquity, validateEquityValue } from '@trading-log/shared';
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

export default router;