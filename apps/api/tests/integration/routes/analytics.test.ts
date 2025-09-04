import { describe, beforeAll, beforeEach, afterAll, it, expect } from '@jest/globals';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import app from '../../../src/app';
import { clearDatabase, createTestUser, createTestTrade } from '../../setup';

const prisma = new PrismaClient();

describe('Analytics API Routes', () => {
  let userId: string;
  const authHeaders = { Authorization: 'Bearer dev-token' };

  beforeAll(async () => {
    await clearDatabase();
  });

  beforeEach(async () => {
    // Clear only trade-related data, not users
    await prisma.methodAnalysis.deleteMany({});
    await prisma.mindsetTag.deleteMany({});
    await prisma.trade.deleteMany({});
    
    // Set the user ID that dev-token expects
    userId = 'dev-user-1';
    // Create the dev user that the auth middleware expects
    await prisma.user.upsert({
      where: { id: 'dev-user-1' },
      update: { email: 'dev@example.com', totalEquity: 100000 },
      create: { id: 'dev-user-1', email: 'dev@example.com', totalEquity: 100000 }
    });
  });

  afterAll(async () => {
    await clearDatabase();
    await prisma.$disconnect();
  });

  // Helper function to create standard test trades using dev database
  const createStandardTestTrades = async () => {
    // Create trades directly in the dev database that API uses
    const trade1 = await prisma.trade.create({
      data: {
        userId,
        symbol: 'AAPL',
        direction: 'LONG',
        entryPrice: 150,
        positionSize: 10,
        stopLoss: 145,
        status: 'CLOSED',
        exitPrice: 155,
        realizedPnL: 50,
        entryDate: new Date(),
        exitDate: new Date(),
        riskAmount: 50, // (150 - 145) * 10
        riskPercentage: 0.05, // 50/100000 * 100
      }
    });

    await prisma.methodAnalysis.create({
      data: {
        tradeId: trade1.id,
        timeframe: 'DAILY',
        indicator: 'MACD',
        signal: 'BUY_SIGNAL',
        divergence: 'NONE'
      }
    });

    await prisma.mindsetTag.create({
      data: {
        tradeId: trade1.id,
        tag: 'DISCIPLINED',
        intensity: 'HIGH'
      }
    });

    const trade2 = await prisma.trade.create({
      data: {
        userId,
        symbol: 'GOOGL',
        direction: 'SHORT',
        entryPrice: 2500,
        positionSize: 2,
        stopLoss: 2520,
        status: 'CLOSED',
        exitPrice: 2480,
        realizedPnL: 40,
        entryDate: new Date(),
        exitDate: new Date(),
        riskAmount: 40, // (2520 - 2500) * 2
        riskPercentage: 0.04, // 40/100000 * 100
      }
    });

    await prisma.methodAnalysis.create({
      data: {
        tradeId: trade2.id,
        timeframe: 'WEEKLY',
        indicator: 'RSI',
        signal: 'SELL_SIGNAL',
        divergence: 'BEARISH'
      }
    });

    await prisma.mindsetTag.create({
      data: {
        tradeId: trade2.id,
        tag: 'PATIENT',
        intensity: 'MEDIUM'
      }
    });

    const trade3 = await prisma.trade.create({
      data: {
        userId,
        symbol: 'TSLA',
        direction: 'LONG',
        entryPrice: 800,
        positionSize: 5,
        stopLoss: 780,
        status: 'CLOSED',
        exitPrice: 775,
        realizedPnL: -125,
        entryDate: new Date(),
        exitDate: new Date(),
        riskAmount: 100, // (800 - 780) * 5
        riskPercentage: 0.10, // 100/100000 * 100
      }
    });

    await prisma.methodAnalysis.create({
      data: {
        tradeId: trade3.id,
        timeframe: 'DAILY',
        indicator: 'RSI',
        signal: 'BUY_SIGNAL',
        divergence: 'NONE'
      }
    });

    await prisma.mindsetTag.create({
      data: {
        tradeId: trade3.id,
        tag: 'IMPULSIVE',
        intensity: 'HIGH'
      }
    });

    // Active trade
    await prisma.trade.create({
      data: {
        userId,
        symbol: 'MSFT',
        direction: 'LONG',
        entryPrice: 300,
        positionSize: 8,
        stopLoss: 295,
        status: 'ACTIVE',
        entryDate: new Date(),
        riskAmount: 40, // (300 - 295) * 8
        riskPercentage: 0.04, // 40/100000 * 100
      }
    });
  };

  describe('GET /api/analytics', () => {
    it('should return all trades without filters', async () => {
      await createStandardTestTrades();

      const response = await request(app)
        .get('/api/analytics')
        .set(authHeaders);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.trades).toHaveLength(4);
      expect(response.body.data.totalCount).toBe(4);
      expect(response.body.data.summary).toBeDefined();
      expect(response.body.data.summary.winRate).toBeCloseTo(66.67, 1); // 2 wins out of 3 closed trades
    });

    it('should filter by outcome', async () => {
      await createStandardTestTrades();
      const response = await request(app)
        .get('/api/analytics')
        .query({ outcomes: ['WIN'] })
        .set(authHeaders);

      expect(response.status).toBe(200);
      expect(response.body.data.trades).toHaveLength(2);
      expect(response.body.data.trades.every((trade: any) => trade.outcome === 'WIN')).toBe(true);
    });

    it('should filter by symbol', async () => {
      await createStandardTestTrades();
      const response = await request(app)
        .get('/api/analytics')
        .query({ symbols: ['AAPL', 'GOOGL'] })
        .set(authHeaders);

      expect(response.status).toBe(200);
      expect(response.body.data.trades).toHaveLength(2);
      expect(response.body.data.trades.every((trade: any) => 
        ['AAPL', 'GOOGL'].includes(trade.symbol)
      )).toBe(true);
    });

    it('should filter by indicator', async () => {
      await createStandardTestTrades();
      const response = await request(app)
        .get('/api/analytics')
        .query({ indicators: ['MACD'] })
        .set(authHeaders);

      expect(response.status).toBe(200);
      expect(response.body.data.trades).toHaveLength(1);
      expect(response.body.data.trades[0].symbol).toBe('AAPL');
    });

    it('should filter by mindset tags', async () => {
      await createStandardTestTrades();
      const response = await request(app)
        .get('/api/analytics')
        .query({ mindsetTags: ['DISCIPLINED'] })
        .set(authHeaders);

      expect(response.status).toBe(200);
      expect(response.body.data.trades).toHaveLength(1);
      expect(response.body.data.trades[0].symbol).toBe('AAPL');
    });

    it('should filter by trade direction', async () => {
      await createStandardTestTrades();
      const response = await request(app)
        .get('/api/analytics')
        .query({ tradeDirections: ['SHORT'] })
        .set(authHeaders);

      expect(response.status).toBe(200);
      expect(response.body.data.trades).toHaveLength(1);
      expect(response.body.data.trades[0].symbol).toBe('GOOGL');
      expect(response.body.data.trades[0].direction).toBe('SHORT');
    });

    it('should filter by risk range', async () => {
      await createStandardTestTrades();
      const response = await request(app)
        .get('/api/analytics')
        .query({ 'riskRange[min]': '40', 'riskRange[max]': '60' })
        .set(authHeaders);


      expect(response.status).toBe(200);
      expect(response.body.data.trades.length).toBeGreaterThan(0);
      expect(response.body.data.trades.every((trade: any) => 
        trade.riskAmount >= 40 && trade.riskAmount <= 60
      )).toBe(true);
    });

    it('should combine multiple filters', async () => {
      await createStandardTestTrades();
      const response = await request(app)
        .get('/api/analytics')
        .query({ 
          outcomes: ['WIN'],
          tradeDirections: ['LONG']
        })
        .set(authHeaders);

      expect(response.status).toBe(200);
      expect(response.body.data.trades).toHaveLength(1);
      expect(response.body.data.trades[0].symbol).toBe('AAPL');
      expect(response.body.data.trades[0].outcome).toBe('WIN');
      expect(response.body.data.trades[0].direction).toBe('LONG');
    });

    it('should support pagination', async () => {
      await createStandardTestTrades();
      const response = await request(app)
        .get('/api/analytics')
        .query({ page: '1', limit: '2' })
        .set(authHeaders);

      expect(response.status).toBe(200);
      expect(response.body.data.trades).toHaveLength(2);
      expect(response.body.data.totalCount).toBe(4);
    });

    it('should support sorting', async () => {
      await createStandardTestTrades();
      const response = await request(app)
        .get('/api/analytics')
        .query({ sortBy: 'symbol', sortOrder: 'asc' })
        .set(authHeaders);

      expect(response.status).toBe(200);
      expect(response.body.data.trades).toHaveLength(4);
      expect(response.body.data.trades[0].symbol).toBe('AAPL');
    });

    it('should calculate correct summary statistics', async () => {
      await createStandardTestTrades();
      const response = await request(app)
        .get('/api/analytics')
        .set(authHeaders);

      expect(response.status).toBe(200);
      const { summary } = response.body.data;
      
      expect(summary.winRate).toBeCloseTo(66.67, 1); // 2 wins out of 3 closed
      expect(summary.totalPnL).toBe(-35); // 50 + 40 - 125
      expect(summary.averageRisk).toBeGreaterThan(0);
      expect(summary.mostCommonIndicator).toBeDefined();
      expect(summary.dominantMindset).toBeDefined();
    });

    it('should return empty results for user with no trades', async () => {
      // Clear all trades for the dev user
      await prisma.methodAnalysis.deleteMany({ where: { trade: { userId } } });
      await prisma.mindsetTag.deleteMany({ where: { trade: { userId } } });
      await prisma.trade.deleteMany({ where: { userId } });
      
      const response = await request(app)
        .get('/api/analytics')
        .set(authHeaders);

      expect(response.status).toBe(200);
      expect(response.body.data.trades).toHaveLength(0);
      expect(response.body.data.totalCount).toBe(0);
      expect(response.body.data.summary.winRate).toBe(0);
      expect(response.body.data.summary.totalPnL).toBe(0);
    });
  });

  describe('GET /api/analytics/presets', () => {
    it('should return default filter presets', async () => {
      const response = await request(app)
        .get('/api/analytics/presets')
        .set(authHeaders);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      
      const allTradesPreset = response.body.data.find((preset: any) => preset.id === 'all-trades');
      expect(allTradesPreset).toBeDefined();
      expect(allTradesPreset.isDefault).toBe(true);
    });
  });

  describe('GET /api/analytics/options', () => {
    it('should return available filter options', async () => {
      const trade = await prisma.trade.create({
        data: {
          userId,
          symbol: 'AAPL',
          direction: 'LONG',
          entryPrice: 150,
          positionSize: 10,
          stopLoss: 145,
          status: 'ACTIVE',
          entryDate: new Date(),
          riskAmount: 50,
          riskPercentage: 0.05,
        }
      });

      await prisma.methodAnalysis.create({
        data: {
          tradeId: trade.id,
          timeframe: 'DAILY',
          indicator: 'MACD',
          signal: 'BUY_SIGNAL',
          divergence: 'NONE'
        }
      });

      await prisma.mindsetTag.create({
        data: {
          tradeId: trade.id,
          tag: 'DISCIPLINED',
          intensity: 'HIGH'
        }
      });
      
      const response = await request(app)
        .get('/api/analytics/options')
        .set(authHeaders);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.symbols).toContain('AAPL');
      expect(response.body.data.indicators).toContain('MACD');
      expect(response.body.data.signals).toContain('BUY_SIGNAL');
      expect(response.body.data.mindsetTags).toContain('DISCIPLINED');
    });

    it('should return empty arrays for user with no trades', async () => {
      // Clear all trades for the dev user
      await prisma.methodAnalysis.deleteMany({ where: { trade: { userId } } });
      await prisma.mindsetTag.deleteMany({ where: { trade: { userId } } });
      await prisma.trade.deleteMany({ where: { userId } });
      
      const response = await request(app)
        .get('/api/analytics/options')
        .set(authHeaders);

      expect(response.status).toBe(200);
      expect(response.body.data.symbols).toHaveLength(0);
      expect(response.body.data.indicators).toHaveLength(0);
      expect(response.body.data.signals).toHaveLength(0);
      expect(response.body.data.mindsetTags).toHaveLength(0);
    });
  });

  describe('Authentication', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/analytics');

      expect(response.status).toBe(401);
    });

    it('should only return data for authenticated user', async () => {
      // Create a trade for our authenticated user
      await prisma.trade.create({
        data: {
          userId,
          symbol: 'AAPL',
          direction: 'LONG',
          entryPrice: 150,
          positionSize: 10,
          stopLoss: 145,
          status: 'ACTIVE',
          entryDate: new Date(),
          riskAmount: 50,
          riskPercentage: 0.05,
        }
      });
      
      // Create another user and trade (should not appear in results due to auth isolation)
      const user2 = await prisma.user.create({
        data: {
          email: `test-${Date.now()}@example.com`,
          totalEquity: 100000,
        }
      });
      
      await prisma.trade.create({
        data: {
          userId: user2.id,
          symbol: 'GOOGL',
          direction: 'LONG',
          entryPrice: 2500,
          positionSize: 2,
          stopLoss: 2450,
          status: 'ACTIVE',
          entryDate: new Date(),
          riskAmount: 100,
          riskPercentage: 0.10,
        }
      });

      const response = await request(app)
        .get('/api/analytics')
        .set(authHeaders);

      expect(response.status).toBe(200);
      expect(response.body.data.trades).toHaveLength(1);
      expect(response.body.data.trades[0].symbol).toBe('AAPL');
    });
  });
});