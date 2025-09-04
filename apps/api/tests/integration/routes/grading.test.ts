import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import app from '../../../src/app';
import { clearDatabase, createTestUser, createTestTrade } from '../../setup';

const prisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL,
});

describe('Grading API Integration Tests', () => {
  let testUserId: string;
  let testTradeId: string;

  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean up before each test
    await clearDatabase();

    // Also clean up grading tables
    await prisma.gradeHistory.deleteMany();
    await prisma.tradeGrade.deleteMany();

    // Create test user
    const user = await createTestUser();
    testUserId = user.id;
  });

  describe('POST /api/grading/:tradeId/calculate', () => {
    beforeEach(async () => {
      // Create a test trade with complete analysis
      const trade = await prisma.trade.create({
        data: {
          userId: testUserId,
          symbol: 'AAPL',
          direction: 'LONG',
          entryPrice: 150.00,
          positionSize: 100,
          stopLoss: 145.00,
          exitPrice: 160.00,
          status: 'CLOSED',
          entryDate: new Date('2023-01-01'),
          exitDate: new Date('2023-01-02'),
          realizedPnL: 1000.00,
          riskAmount: 500.00, // 0.5% of 100k equity
          riskPercentage: 0.5,
          notes: 'Test trade for grading',
          // Alignment data
          alignmentScore: 0.8,
          alignmentLevel: 'STRONG_ALIGNMENT',
          alignmentWarnings: JSON.stringify([]),
          alignmentConfirmations: JSON.stringify(['Strong bullish signals', 'Good momentum'])
        }
      });

      testTradeId = trade.id;

      // Add method analysis
      await prisma.methodAnalysis.createMany({
        data: [
          {
            tradeId: testTradeId,
            timeframe: 'DAILY',
            indicator: 'MACD',
            signal: 'BUY_SIGNAL',
            divergence: 'NONE',
            notes: 'Strong buy signal'
          },
          {
            tradeId: testTradeId,
            timeframe: 'WEEKLY',
            indicator: 'RSI',
            signal: 'BUY_SIGNAL',
            divergence: 'NONE',
            notes: 'Oversold condition'
          },
          {
            tradeId: testTradeId,
            timeframe: 'MONTHLY',
            indicator: 'SMA',
            signal: 'BUY_SIGNAL',
            divergence: 'NONE',
            notes: 'Above moving average'
          }
        ]
      });

      // Add mindset tags
      await prisma.mindsetTag.createMany({
        data: [
          {
            tradeId: testTradeId,
            tag: 'DISCIPLINED',
            intensity: 'HIGH'
          },
          {
            tradeId: testTradeId,
            tag: 'PATIENT',
            intensity: 'MEDIUM'
          }
        ]
      });
    });

    it('should calculate and return grade for a trade', async () => {
      const response = await request(app)
        .post(`/api/grading/${testTradeId}/calculate`)
        .set('Authorization', 'Bearer dev-token')
        .send({ reason: 'MANUAL_RECALC' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('overall');
      expect(response.body.data).toHaveProperty('score');
      expect(response.body.data).toHaveProperty('breakdown');
      expect(response.body.data).toHaveProperty('explanation');
      expect(response.body.data).toHaveProperty('recommendations');

      // Verify grade is stored in database
      const storedGrade = await prisma.tradeGrade.findUnique({
        where: { tradeId: testTradeId }
      });
      expect(storedGrade).toBeTruthy();
      expect(storedGrade!.overall).toBe(response.body.data.overall);

      // Verify grade history is created
      const gradeHistory = await prisma.gradeHistory.findFirst({
        where: { tradeId: testTradeId }
      });
      expect(gradeHistory).toBeTruthy();
      expect(gradeHistory!.reason).toBe('MANUAL_RECALC');
    });

    it('should return high grade for excellent trade setup', async () => {
      const response = await request(app)
        .post(`/api/grading/${testTradeId}/calculate`)
        .set('Authorization', 'Bearer dev-token')
        .send({ reason: 'TRADE_CLOSE' });

      expect(response.status).toBe(200);
      
      // Should be an A or B grade for this excellent setup
      expect(['A+', 'A', 'A-', 'B+', 'B']).toContain(response.body.data.overall);
      expect(response.body.data.score).toBeGreaterThan(80);
      
      // Should have positive factors
      const { breakdown } = response.body.data;
      expect(breakdown.riskManagement.score).toBeGreaterThan(90); // Low risk
      expect(breakdown.methodAlignment.score).toBeGreaterThan(90); // Strong alignment
      expect(breakdown.mindsetQuality.score).toBeGreaterThan(90); // Positive mindset
    });

    it('should return 404 for non-existent trade', async () => {
      const response = await request(app)
        .post('/api/grading/non-existent-trade/calculate')
        .set('Authorization', 'Bearer dev-token')
        .send({ reason: 'MANUAL_RECALC' });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('should return 400 for invalid request body', async () => {
      const response = await request(app)
        .post(`/api/grading/${testTradeId}/calculate`)
        .set('Authorization', 'Bearer dev-token')
        .send({ reason: 'INVALID_REASON' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/grading/:tradeId', () => {
    beforeEach(async () => {
      // Create trade and calculate grade
      const trade = await createTestTrade(testUserId, {
        symbol: 'TSLA',
        status: 'CLOSED',
        realizedPnL: 500
      });
      testTradeId = trade.id;

      // Create grade manually
      await prisma.tradeGrade.create({
        data: {
          tradeId: testTradeId,
          overall: 'A',
          score: 92.5,
          riskScore: 95,
          alignmentScore: 88,
          mindsetScore: 92,
          executionScore: 95,
          explanation: JSON.stringify(['Excellent trade execution', 'Low risk profile']),
          recommendations: JSON.stringify([])
        }
      });

      // Create grade history
      await prisma.gradeHistory.createMany({
        data: [
          {
            tradeId: testTradeId,
            grade: 'A',
            score: 92.5,
            reason: 'TRADE_CLOSE',
            calculatedAt: new Date('2023-01-02')
          },
          {
            tradeId: testTradeId,
            grade: 'B+',
            score: 87.0,
            reason: 'ANALYSIS_UPDATE',
            calculatedAt: new Date('2023-01-01')
          }
        ]
      });
    });

    it('should return grade for a trade', async () => {
      const response = await request(app)
        .get(`/api/grading/${testTradeId}`)
        .set('Authorization', 'Bearer dev-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.overall).toBe('A');
      expect(response.body.data.score).toBe(92.5);
      expect(response.body.data.history).toHaveLength(2);
      expect(response.body.data.history[0].reason).toBe('TRADE_CLOSE'); // Most recent first
    });

    it('should return 404 for trade without grade', async () => {
      // Create a trade without grade
      const newTrade = await createTestTrade(testUserId, { symbol: 'NVDA' });
      
      const response = await request(app)
        .get(`/api/grading/${newTrade.id}`)
        .set('Authorization', 'Bearer dev-token');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('No grade found');
    });
  });

  describe('GET /api/grading', () => {
    beforeEach(async () => {
      // Create multiple trades with grades for analytics
      const trades = await Promise.all([
        createTestTrade(testUserId, { symbol: 'AAPL', realizedPnL: 1000 }),
        createTestTrade(testUserId, { symbol: 'TSLA', realizedPnL: 500 }),
        createTestTrade(testUserId, { symbol: 'MSFT', realizedPnL: -200 })
      ]);

      // Create grades for each trade
      await prisma.tradeGrade.createMany({
        data: [
          {
            tradeId: trades[0].id,
            overall: 'A',
            score: 95,
            riskScore: 95,
            alignmentScore: 90,
            mindsetScore: 98,
            executionScore: 95,
            explanation: JSON.stringify(['Excellent trade']),
            recommendations: JSON.stringify([])
          },
          {
            tradeId: trades[1].id,
            overall: 'B+',
            score: 87,
            riskScore: 85,
            alignmentScore: 88,
            mindsetScore: 90,
            executionScore: 85,
            explanation: JSON.stringify(['Good trade execution']),
            recommendations: JSON.stringify(['Consider tighter stops'])
          },
          {
            tradeId: trades[2].id,
            overall: 'C',
            score: 75,
            riskScore: 70,
            alignmentScore: 75,
            mindsetScore: 80,
            executionScore: 75,
            explanation: JSON.stringify(['Average trade']),
            recommendations: JSON.stringify(['Improve risk management', 'Better signal analysis'])
          }
        ]
      });
    });

    it('should return grade analytics for all time', async () => {
      const response = await request(app)
        .get('/api/grading?timeRange=all')
        .set('Authorization', 'Bearer dev-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('analytics');
      expect(response.body.data).toHaveProperty('coachingRecommendations');
      expect(response.body.data).toHaveProperty('totalTrades');

      const { analytics, totalTrades } = response.body.data;
      
      expect(totalTrades).toBe(3);
      expect(analytics.averageGrade).toBeCloseTo(85.67, 1); // (95 + 87 + 75) / 3
      expect(analytics.gradeDistribution).toHaveProperty('A');
      expect(analytics.gradeDistribution).toHaveProperty('B+');
      expect(analytics.gradeDistribution).toHaveProperty('C');
      
      expect(analytics.gradeDistribution['A']).toBe(1);
      expect(analytics.gradeDistribution['B+']).toBe(1);
      expect(analytics.gradeDistribution['C']).toBe(1);
    });

    it('should return coaching recommendations for poor performance', async () => {
      // Create additional poor trades to trigger coaching
      const poorTrade = await createTestTrade(testUserId, { symbol: 'AMD', realizedPnL: -500 });
      
      await prisma.tradeGrade.create({
        data: {
          tradeId: poorTrade.id,
          overall: 'D',
          score: 60,
          riskScore: 50, // Poor risk management
          alignmentScore: 65,
          mindsetScore: 55, // Poor mindset
          executionScore: 70,
          explanation: JSON.stringify(['Poor trade execution']),
          recommendations: JSON.stringify(['Improve risk management', 'Better psychological preparation'])
        }
      });

      const response = await request(app)
        .get('/api/grading')
        .set('Authorization', 'Bearer dev-token');

      expect(response.status).toBe(200);
      
      const { coachingRecommendations } = response.body.data;
      expect(coachingRecommendations.length).toBeGreaterThan(0);
      
      const riskRec = coachingRecommendations.find((rec: any) => rec.category === 'RISK_MANAGEMENT');
      expect(riskRec).toBeTruthy();
      expect(riskRec.priority).toBe('HIGH');
      expect(riskRec.actionItems.length).toBeGreaterThan(0);
    });

    it('should filter by time range', async () => {
      const response = await request(app)
        .get('/api/grading?timeRange=month')
        .set('Authorization', 'Bearer dev-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      
      // Should still return data but filtered by time range
      // For this test, all grades are recent so should be included
      expect(response.body.data.totalTrades).toBe(3);
    });

    it('should return empty analytics for user with no trades', async () => {
      // Create new user with no trades
      const newUser = await createTestUser();
      
      const response = await request(app)
        .get('/api/grading')
        .set('Authorization', `Bearer ${newUser.email}`); // Use email as token for test

      expect(response.status).toBe(200);
      expect(response.body.data.totalTrades).toBe(0);
      expect(response.body.data.analytics.averageGrade).toBe(0);
    });
  });

  describe('Automatic Grade Calculation on Trade Events', () => {
    it('should automatically calculate grade when trade is closed', async () => {
      // Create an active trade first
      const activeTrade = await prisma.trade.create({
        data: {
          userId: testUserId,
          symbol: 'GOOGL',
          direction: 'LONG',
          entryPrice: 2500.00,
          positionSize: 10,
          stopLoss: 2450.00,
          status: 'ACTIVE',
          entryDate: new Date(),
          riskAmount: 500.00,
          riskPercentage: 0.5,
          notes: 'Test active trade',
          alignmentScore: 0.6,
          alignmentLevel: 'WEAK_ALIGNMENT'
        }
      });

      // Add some analysis
      await prisma.methodAnalysis.create({
        data: {
          tradeId: activeTrade.id,
          timeframe: 'DAILY',
          indicator: 'MACD',
          signal: 'BUY_SIGNAL',
          divergence: 'NONE'
        }
      });

      await prisma.mindsetTag.create({
        data: {
          tradeId: activeTrade.id,
          tag: 'CONFIDENT',
          intensity: 'MEDIUM'
        }
      });

      // Close the trade via API
      const response = await request(app)
        .post(`/api/trades/${activeTrade.id}/close`)
        .set('Authorization', 'Bearer dev-token')
        .send({ exitPrice: 2600.00 });

      expect(response.status).toBe(200);

      // Verify grade was automatically calculated
      const grade = await prisma.tradeGrade.findUnique({
        where: { tradeId: activeTrade.id }
      });

      expect(grade).toBeTruthy();
      expect(grade!.overall).toMatch(/[A-F][+-]?/);

      // Verify grade history entry was created
      const history = await prisma.gradeHistory.findFirst({
        where: { tradeId: activeTrade.id, reason: 'TRADE_CLOSE' }
      });

      expect(history).toBeTruthy();
    });
  });
});