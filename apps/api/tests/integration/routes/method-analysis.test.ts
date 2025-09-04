import request from 'supertest';
import express from 'express';
import { PrismaClient } from '@prisma/client';
import tradesRouter from '../../../src/routes/trades';
import { authMiddleware } from '../../helpers/auth';
import { IndicatorType, SignalType, TimeframeType, DivergenceType } from '@trading-log/shared';

const app = express();
app.use(express.json());
app.use('/api/trades', authMiddleware, tradesRouter);

const prisma = new PrismaClient();

describe('Method Analysis API Integration Tests', () => {
  let testUserId: string;

  beforeAll(async () => {
    // Create test user
    const testUser = await prisma.user.create({
      data: {
        email: 'methodanalysis@test.com',
        totalEquity: 10000
      }
    });
    testUserId = testUser.id;
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.methodAnalysis.deleteMany({});
    await prisma.trade.deleteMany({});
    await prisma.user.deleteMany({
      where: { email: 'methodanalysis@test.com' }
    });
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean up trades and analysis before each test
    await prisma.methodAnalysis.deleteMany({});
    await prisma.trade.deleteMany({});
  });

  describe('POST /api/trades with method analysis', () => {
    it('should create trade with complete method analysis', async () => {
      const tradeData = {
        symbol: 'AAPL',
        direction: 'LONG',
        entryPrice: 150.00,
        positionSize: 100,
        stopLoss: 145.00,
        notes: 'Test trade with analysis',
        methodAnalysis: [
          {
            timeframe: TimeframeType.DAILY,
            indicator: IndicatorType.MACD,
            signal: SignalType.BUY_SIGNAL,
            divergence: DivergenceType.BULLISH,
            notes: 'Strong MACD bullish divergence on daily chart'
          },
          {
            timeframe: TimeframeType.WEEKLY,
            indicator: IndicatorType.RSI,
            signal: SignalType.OVERSOLD,
            divergence: DivergenceType.NONE,
            notes: 'RSI oversold, potential bounce'
          }
        ]
      };

      const response = await request(app)
        .post('/api/trades')
        .set('x-user-id', testUserId)
        .send(tradeData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.symbol).toBe('AAPL');

      // Verify method analysis was created
      const trade = await prisma.trade.findFirst({
        where: { symbol: 'AAPL' },
        include: { methodAnalysis: true }
      });

      expect(trade).toBeTruthy();
      expect(trade!.methodAnalysis).toHaveLength(2);
      expect(trade!.methodAnalysis[0].timeframe).toBe('DAILY');
      expect(trade!.methodAnalysis[0].indicator).toBe('MACD');
      expect(trade!.methodAnalysis[1].timeframe).toBe('WEEKLY');
      expect(trade!.methodAnalysis[1].indicator).toBe('RSI');
    });

    it('should create trade without method analysis', async () => {
      const tradeData = {
        symbol: 'GOOGL',
        direction: 'SHORT',
        entryPrice: 2800.00,
        positionSize: 10,
        stopLoss: 2850.00,
        notes: 'Test trade without analysis'
      };

      const response = await request(app)
        .post('/api/trades')
        .set('x-user-id', testUserId)
        .send(tradeData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.symbol).toBe('GOOGL');

      // Verify no method analysis was created
      const trade = await prisma.trade.findFirst({
        where: { symbol: 'GOOGL' },
        include: { methodAnalysis: true }
      });

      expect(trade).toBeTruthy();
      expect(trade!.methodAnalysis).toHaveLength(0);
    });

    it('should reject trade with duplicate timeframe analysis', async () => {
      const tradeData = {
        symbol: 'TSLA',
        direction: 'LONG',
        entryPrice: 800.00,
        positionSize: 25,
        stopLoss: 780.00,
        methodAnalysis: [
          {
            timeframe: TimeframeType.DAILY,
            indicator: IndicatorType.MACD,
            signal: SignalType.BUY_SIGNAL,
            divergence: DivergenceType.BULLISH
          },
          {
            timeframe: TimeframeType.DAILY, // Duplicate
            indicator: IndicatorType.RSI,
            signal: SignalType.OVERSOLD,
            divergence: DivergenceType.NONE
          }
        ]
      };

      const response = await request(app)
        .post('/api/trades')
        .set('x-user-id', testUserId)
        .send(tradeData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid method analysis');
      expect(response.body.message).toBe('Duplicate timeframe analysis');
    });
  });

  describe('PATCH /api/trades/:tradeId/analysis', () => {
    let testTradeId: string;

    beforeEach(async () => {
      // Create a test trade
      const trade = await prisma.trade.create({
        data: {
          userId: testUserId,
          symbol: 'MSFT',
          direction: 'LONG',
          entryPrice: 300.00,
          positionSize: 50,
          stopLoss: 290.00,
          status: 'ACTIVE',
          entryDate: new Date(),
          riskAmount: 500,
          riskPercentage: 5.0,
          alignmentScore: null,
          alignmentLevel: null,
          alignmentWarnings: null,
          alignmentConfirmations: null
        }
      });
      testTradeId = trade.id;
    });

    it('should update method analysis for existing trade', async () => {
      const analysisData = [
        {
          timeframe: TimeframeType.DAILY,
          indicator: IndicatorType.BOLLINGER_BANDS,
          signal: SignalType.OVERSOLD,
          divergence: DivergenceType.BULLISH,
          notes: 'Price touching lower Bollinger band with bullish divergence'
        },
        {
          timeframe: TimeframeType.MONTHLY,
          indicator: IndicatorType.VOLUME,
          signal: SignalType.BREAKOUT,
          divergence: DivergenceType.NONE,
          notes: 'High volume breakout above resistance'
        }
      ];

      const response = await request(app)
        .patch(`/api/trades/${testTradeId}/analysis`)
        .set('x-user-id', testUserId)
        .send(analysisData)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify analysis was updated
      const trade = await prisma.trade.findUnique({
        where: { id: testTradeId },
        include: { methodAnalysis: true }
      });

      expect(trade!.methodAnalysis).toHaveLength(2);
      expect(trade!.methodAnalysis[0].indicator).toBe('BOLLINGER_BANDS');
      expect(trade!.methodAnalysis[1].indicator).toBe('VOLUME');
    });

    it('should replace existing analysis completely', async () => {
      // First, create some initial analysis
      await prisma.methodAnalysis.create({
        data: {
          tradeId: testTradeId,
          timeframe: 'DAILY',
          indicator: 'MACD',
          signal: 'BUY_SIGNAL',
          divergence: 'NONE'
        }
      });

      // Now update with completely different analysis
      const newAnalysisData = [
        {
          timeframe: TimeframeType.WEEKLY,
          indicator: IndicatorType.RSI,
          signal: SignalType.OVERBOUGHT,
          divergence: DivergenceType.BEARISH,
          notes: 'RSI showing overbought with bearish divergence'
        }
      ];

      const response = await request(app)
        .patch(`/api/trades/${testTradeId}/analysis`)
        .set('x-user-id', testUserId)
        .send(newAnalysisData)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify old analysis was replaced
      const trade = await prisma.trade.findUnique({
        where: { id: testTradeId },
        include: { methodAnalysis: true }
      });

      expect(trade!.methodAnalysis).toHaveLength(1);
      expect(trade!.methodAnalysis[0].timeframe).toBe('WEEKLY');
      expect(trade!.methodAnalysis[0].indicator).toBe('RSI');
      expect(trade!.methodAnalysis[0].signal).toBe('OVERBOUGHT');
    });

    it('should clear analysis when empty array is sent', async () => {
      // First, create some initial analysis
      await prisma.methodAnalysis.create({
        data: {
          tradeId: testTradeId,
          timeframe: 'DAILY',
          indicator: 'MACD',
          signal: 'BUY_SIGNAL',
          divergence: 'NONE'
        }
      });

      const response = await request(app)
        .patch(`/api/trades/${testTradeId}/analysis`)
        .set('x-user-id', testUserId)
        .send([])
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify analysis was cleared
      const trade = await prisma.trade.findUnique({
        where: { id: testTradeId },
        include: { methodAnalysis: true }
      });

      expect(trade!.methodAnalysis).toHaveLength(0);
    });

    it('should return 404 for non-existent trade', async () => {
      const analysisData = [
        {
          timeframe: TimeframeType.DAILY,
          indicator: IndicatorType.MACD,
          signal: SignalType.BUY_SIGNAL,
          divergence: DivergenceType.BULLISH
        }
      ];

      const response = await request(app)
        .patch('/api/trades/non-existent-id/analysis')
        .set('x-user-id', testUserId)
        .send(analysisData)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Trade not found');
    });

    it('should reject invalid analysis data', async () => {
      const invalidAnalysisData = [
        {
          timeframe: 'INVALID_TIMEFRAME',
          indicator: IndicatorType.MACD,
          signal: SignalType.BUY_SIGNAL,
          divergence: DivergenceType.BULLISH
        }
      ];

      const response = await request(app)
        .patch(`/api/trades/${testTradeId}/analysis`)
        .set('x-user-id', testUserId)
        .send(invalidAnalysisData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid request data');
    });
  });

  describe('GET /api/trades with method analysis', () => {
    it('should return trades with method analysis included', async () => {
      // Create trade with analysis
      const trade = await prisma.trade.create({
        data: {
          userId: testUserId,
          symbol: 'NVDA',
          direction: 'LONG',
          entryPrice: 500.00,
          positionSize: 20,
          stopLoss: 480.00,
          status: 'ACTIVE',
          entryDate: new Date(),
          riskAmount: 400,
          riskPercentage: 4.0,
          alignmentScore: null,
          alignmentLevel: null,
          alignmentWarnings: null,
          alignmentConfirmations: null
        }
      });

      await prisma.methodAnalysis.create({
        data: {
          tradeId: trade.id,
          timeframe: 'DAILY',
          indicator: 'MACD',
          signal: 'BUY_SIGNAL',
          divergence: 'BULLISH',
          notes: 'Strong momentum'
        }
      });

      const response = await request(app)
        .get('/api/trades')
        .set('x-user-id', testUserId)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].symbol).toBe('NVDA');
    });
  });
});