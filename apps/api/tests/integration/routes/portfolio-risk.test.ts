import request from 'supertest';
import app from '../../../src/app';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('Portfolio Risk API', () => {
  const testUserId = 'dev-user-1'; // Match the auth middleware's dev user ID

  beforeEach(async () => {
    // Clean up test data
    await prisma.trade.deleteMany({ where: { userId: testUserId } });
    await prisma.user.deleteMany({ where: { id: testUserId } });

    // Create test user with $10,000 equity
    await prisma.user.create({
      data: {
        id: testUserId,
        email: 'portfolio-test@example.com',
        totalEquity: 10000
      }
    });
  });

  afterEach(async () => {
    await prisma.trade.deleteMany({ where: { userId: testUserId } });
    await prisma.user.deleteMany({ where: { id: testUserId } });
  });

  describe('GET /api/user/portfolio-risk', () => {
    it('should return zero risk with no active trades', async () => {
      const response = await request(app)
        .get('/api/user/portfolio-risk')
        .set('Authorization', 'Bearer dev-token')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          totalRiskAmount: 0,
          totalRiskPercentage: 0,
          exceedsLimit: false,
          riskLevel: 'SAFE',
          userEquity: 10000,
          activeTrades: []
        }
      });
    });

    it('should calculate portfolio risk with single active trade', async () => {
      // Create an active trade with $200 risk (2% of $10,000)
      await prisma.trade.create({
        data: {
          userId: testUserId,
          symbol: 'AAPL',
          direction: 'LONG',
          entryPrice: 150,
          positionSize: 100,
          stopLoss: 148,
          status: 'ACTIVE',
          entryDate: new Date(),
          riskAmount: 200,
          riskPercentage: 2.0,
          alignmentScore: null,
          alignmentLevel: null,
          alignmentWarnings: null,
          alignmentConfirmations: null
        }
      });

      const response = await request(app)
        .get('/api/user/portfolio-risk')
        .set('Authorization', 'Bearer dev-token')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          totalRiskAmount: 200,
          totalRiskPercentage: 2.0,
          exceedsLimit: false,
          riskLevel: 'SAFE',
          userEquity: 10000,
          activeTrades: [
            {
              id: expect.any(String),
              symbol: 'AAPL',
              riskAmount: 200,
              riskPercentage: 2.0
            }
          ]
        }
      });
    });

    it('should calculate portfolio risk with multiple active trades', async () => {
      // Create multiple active trades totaling $500 risk (5% of $10,000)
      await prisma.trade.createMany({
        data: [
          {
            userId: testUserId,
            symbol: 'AAPL',
            direction: 'LONG',
            entryPrice: 150,
            positionSize: 100,
            stopLoss: 148,
            status: 'ACTIVE',
            entryDate: new Date(),
            riskAmount: 200,
            riskPercentage: 2.0,
            alignmentScore: null,
            alignmentLevel: null,
            alignmentWarnings: null,
            alignmentConfirmations: null
          },
          {
            userId: testUserId,
            symbol: 'TSLA',
            direction: 'LONG',
            entryPrice: 250,
            positionSize: 50,
            stopLoss: 244,
            status: 'ACTIVE',
            entryDate: new Date(),
            riskAmount: 300,
            riskPercentage: 3.0,
            alignmentScore: null,
            alignmentLevel: null,
            alignmentWarnings: null,
            alignmentConfirmations: null
          }
        ]
      });

      const response = await request(app)
        .get('/api/user/portfolio-risk')
        .set('Authorization', 'Bearer dev-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.totalRiskAmount).toBe(500);
      expect(response.body.data.totalRiskPercentage).toBe(5.0);
      expect(response.body.data.exceedsLimit).toBe(false);
      expect(response.body.data.riskLevel).toBe('WARNING');
      expect(response.body.data.activeTrades).toHaveLength(2);
    });

    it('should show DANGER level when exceeding 6% limit', async () => {
      // Create trades totaling $700 risk (7% of $10,000)
      await prisma.trade.createMany({
        data: [
          {
            userId: testUserId,
            symbol: 'AAPL',
            direction: 'LONG',
            entryPrice: 150,
            positionSize: 200,
            stopLoss: 148,
            status: 'ACTIVE',
            entryDate: new Date(),
            riskAmount: 400,
            riskPercentage: 4.0,
            alignmentScore: null,
            alignmentLevel: null,
            alignmentWarnings: null,
            alignmentConfirmations: null
          },
          {
            userId: testUserId,
            symbol: 'TSLA',
            direction: 'LONG',
            entryPrice: 250,
            positionSize: 100,
            stopLoss: 247,
            status: 'ACTIVE',
            entryDate: new Date(),
            riskAmount: 300,
            riskPercentage: 3.0,
            alignmentScore: null,
            alignmentLevel: null,
            alignmentWarnings: null,
            alignmentConfirmations: null
          }
        ]
      });

      const response = await request(app)
        .get('/api/user/portfolio-risk')
        .set('Authorization', 'Bearer dev-token')
        .expect(200);

      expect(response.body.data.totalRiskAmount).toBe(700);
      expect(response.body.data.totalRiskPercentage).toBe(7.0);
      expect(response.body.data.exceedsLimit).toBe(true);
      expect(response.body.data.riskLevel).toBe('DANGER');
    });

    it('should exclude closed trades from portfolio risk calculation', async () => {
      await prisma.trade.createMany({
        data: [
          {
            userId: testUserId,
            symbol: 'AAPL',
            direction: 'LONG',
            entryPrice: 150,
            positionSize: 100,
            stopLoss: 148,
            status: 'ACTIVE',
            entryDate: new Date(),
            riskAmount: 200,
            riskPercentage: 2.0,
            alignmentScore: null,
            alignmentLevel: null,
            alignmentWarnings: null,
            alignmentConfirmations: null
          },
          {
            userId: testUserId,
            symbol: 'TSLA',
            direction: 'LONG',
            entryPrice: 250,
            positionSize: 50,
            stopLoss: 244,
            exitPrice: 260,
            status: 'CLOSED', // This should be excluded
            entryDate: new Date(),
            exitDate: new Date(),
            riskAmount: 300,
            realizedPnL: 500,
            riskPercentage: 3.0,
            alignmentScore: null,
            alignmentLevel: null,
            alignmentWarnings: null,
            alignmentConfirmations: null
          }
        ]
      });

      const response = await request(app)
        .get('/api/user/portfolio-risk')
        .set('Authorization', 'Bearer dev-token')
        .expect(200);

      expect(response.body.data.totalRiskAmount).toBe(200);
      expect(response.body.data.totalRiskPercentage).toBe(2.0);
      expect(response.body.data.activeTrades).toHaveLength(1);
      expect(response.body.data.activeTrades[0].symbol).toBe('AAPL');
    });

    it('should return 403 for invalid token', async () => {
      const response = await request(app)
        .get('/api/user/portfolio-risk')
        .set('Authorization', 'Bearer invalid-token')
        .expect(403);

      expect(response.body).toEqual({
        success: false,
        error: 'Invalid or expired token'
      });
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/user/portfolio-risk')
        .expect(401);

      expect(response.body).toEqual({
        success: false,
        error: 'Access token required'
      });
    });

    it('should handle decimal precision correctly', async () => {
      // Create trade with decimal risk amount
      await prisma.trade.create({
        data: {
          userId: testUserId,
          symbol: 'NVDA',
          direction: 'LONG',
          entryPrice: 123.45,
          positionSize: 81,
          stopLoss: 121.60,
          status: 'ACTIVE',
          entryDate: new Date(),
          riskAmount: 149.85, // 81 * 1.85 = 149.85
          riskPercentage: 1.4985,
          alignmentScore: null,
          alignmentLevel: null,
          alignmentWarnings: null,
          alignmentConfirmations: null
        }
      });

      const response = await request(app)
        .get('/api/user/portfolio-risk')
        .set('Authorization', 'Bearer dev-token')
        .expect(200);

      expect(response.body.data.totalRiskAmount).toBe(149.85);
      expect(response.body.data.totalRiskPercentage).toBe(1.4985);
      expect(response.body.data.riskLevel).toBe('SAFE');
      expect(response.body.data.activeTrades[0].riskPercentage).toBe(1.4985);
    });

    it('should handle risk level boundaries correctly', async () => {
      // Test WARNING threshold at exactly 4.51%
      await prisma.trade.create({
        data: {
          userId: testUserId,
          symbol: 'TEST',
          direction: 'LONG',
          entryPrice: 100,
          positionSize: 451,
          stopLoss: 99,
          status: 'ACTIVE',
          entryDate: new Date(),
          riskAmount: 451, // 4.51% of 10000
          riskPercentage: 4.51,
          alignmentScore: null,
          alignmentLevel: null,
          alignmentWarnings: null,
          alignmentConfirmations: null
        }
      });

      const response = await request(app)
        .get('/api/user/portfolio-risk')
        .set('Authorization', 'Bearer dev-token')
        .expect(200);

      expect(response.body.data.totalRiskPercentage).toBe(4.51);
      expect(response.body.data.riskLevel).toBe('WARNING');
      expect(response.body.data.exceedsLimit).toBe(false);
    });

    it('should return user equity in response', async () => {
      const response = await request(app)
        .get('/api/user/portfolio-risk')
        .set('Authorization', 'Bearer dev-token')
        .expect(200);

      expect(response.body.data.userEquity).toBe(10000);
    });
  });
});