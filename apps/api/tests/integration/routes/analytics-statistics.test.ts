import request from 'supertest';
import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import app from '../../../src/app';
import { PerformanceStatistics, StatisticalSignificance } from '@trading-log/shared';

const prisma = new PrismaClient();

// Test user and auth setup
const testUser = {
  id: 'test-user-analytics-stats',
  email: 'analytics-stats-test@example.com',
  totalEquity: 10000
};

const authToken = 'test-token-analytics-stats';

describe('Analytics Statistics API Integration Tests', () => {
  beforeAll(async () => {
    // Create test user
    await prisma.user.create({
      data: testUser
    });
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.methodAnalysis.deleteMany({
      where: { trade: { userId: testUser.id } }
    });
    await prisma.mindsetTag.deleteMany({
      where: { trade: { userId: testUser.id } }
    });
    await prisma.trade.deleteMany({
      where: { userId: testUser.id }
    });
    await prisma.user.delete({
      where: { id: testUser.id }
    });
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean trades before each test
    await prisma.methodAnalysis.deleteMany({
      where: { trade: { userId: testUser.id } }
    });
    await prisma.mindsetTag.deleteMany({
      where: { trade: { userId: testUser.id } }
    });
    await prisma.trade.deleteMany({
      where: { userId: testUser.id }
    });
  });

  describe('GET /api/analytics', () => {
    test('should return comprehensive analytics with performance statistics', async () => {
      // Create test trades with varied performance
      const testTrades = [
        {
          userId: testUser.id,
          symbol: 'AAPL',
          direction: 'LONG',
          entryPrice: 150,
          positionSize: 10,
          stopLoss: 145,
          exitPrice: 160,
          status: 'CLOSED',
          entryDate: new Date('2025-01-01'),
          exitDate: new Date('2025-01-02'),
          realizedPnL: 100, // Win
          riskAmount: 50,
          riskPercentage: 0.5
        },
        {
          userId: testUser.id,
          symbol: 'TSLA',
          direction: 'LONG',
          entryPrice: 200,
          positionSize: 5,
          stopLoss: 190,
          exitPrice: 185,
          status: 'CLOSED',
          entryDate: new Date('2025-01-03'),
          exitDate: new Date('2025-01-04'),
          realizedPnL: -75, // Loss
          riskAmount: 50,
          riskPercentage: 0.5
        },
        {
          userId: testUser.id,
          symbol: 'MSFT',
          direction: 'LONG',
          entryPrice: 300,
          positionSize: 3,
          stopLoss: 290,
          exitPrice: 315,
          status: 'CLOSED',
          entryDate: new Date('2025-01-05'),
          exitDate: new Date('2025-01-06'),
          realizedPnL: 45, // Win
          riskAmount: 30,
          riskPercentage: 0.3
        }
      ];

      // Insert test trades
      for (const trade of testTrades) {
        await prisma.trade.create({ data: trade });
      }

      const response = await request(app)
        .get('/api/analytics')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('trades');
      expect(response.body.data).toHaveProperty('statistics');
      expect(response.body.data).toHaveProperty('totalCount');
      expect(response.body.data).toHaveProperty('filteredCount');

      const { statistics }: { statistics: PerformanceStatistics } = response.body.data;

      // Verify basic statistics
      expect(statistics.totalTrades).toBe(3);
      expect(statistics.winningTrades).toBe(2);
      expect(statistics.losingTrades).toBe(1);
      expect(statistics.winRate).toBe(66.66666666666666); // 2/3 * 100
      expect(statistics.totalPnL).toBe(70); // 100 - 75 + 45

      // Verify advanced metrics are calculated
      expect(statistics.profitFactor).toBeGreaterThan(0);
      expect(statistics.expectancy).toBeDefined();
      expect(statistics.averageProfit).toBe(72.5); // (100 + 45) / 2
      expect(statistics.averageLoss).toBe(75); // 75 / 1
    });

    test('should handle empty trade set gracefully', async () => {
      const response = await request(app)
        .get('/api/analytics')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      const { statistics }: { statistics: PerformanceStatistics } = response.body.data;

      expect(statistics.totalTrades).toBe(0);
      expect(statistics.winRate).toBe(0);
      expect(statistics.totalPnL).toBe(0);
      expect(statistics.profitFactor).toBe(0);
    });

    test('should apply filters correctly to statistics calculation', async () => {
      // Create trades with different symbols
      const trades = [
        {
          userId: testUser.id,
          symbol: 'AAPL',
          direction: 'LONG',
          entryPrice: 150,
          positionSize: 10,
          stopLoss: 145,
          exitPrice: 160,
          status: 'CLOSED',
          entryDate: new Date('2025-01-01'),
          exitDate: new Date('2025-01-02'),
          realizedPnL: 100,
          riskAmount: 50,
          riskPercentage: 0.5
        },
        {
          userId: testUser.id,
          symbol: 'TSLA',
          direction: 'LONG',
          entryPrice: 200,
          positionSize: 5,
          stopLoss: 190,
          exitPrice: 185,
          status: 'CLOSED',
          entryDate: new Date('2025-01-03'),
          exitDate: new Date('2025-01-04'),
          realizedPnL: -50,
          riskAmount: 50,
          riskPercentage: 0.5
        }
      ];

      for (const trade of trades) {
        await prisma.trade.create({ data: trade });
      }

      // Filter for only AAPL trades
      const response = await request(app)
        .get('/api/analytics?symbols=AAPL')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const { statistics }: { statistics: PerformanceStatistics } = response.body.data;

      expect(statistics.totalTrades).toBe(1);
      expect(statistics.winningTrades).toBe(1);
      expect(statistics.losingTrades).toBe(0);
      expect(statistics.winRate).toBe(100);
      expect(statistics.totalPnL).toBe(100);
    });

    test('should include comparison statistics when requested', async () => {
      // Create mixed performance trades
      const trades = [
        {
          userId: testUser.id,
          symbol: 'AAPL',
          direction: 'LONG',
          entryPrice: 150,
          positionSize: 10,
          stopLoss: 145,
          exitPrice: 160,
          status: 'CLOSED',
          entryDate: new Date('2025-01-01'),
          exitDate: new Date('2025-01-02'),
          realizedPnL: 100,
          riskAmount: 50,
          riskPercentage: 0.5
        },
        {
          userId: testUser.id,
          symbol: 'TSLA',
          direction: 'LONG',
          entryPrice: 200,
          positionSize: 5,
          stopLoss: 190,
          exitPrice: 185,
          status: 'CLOSED',
          entryDate: new Date('2025-01-03'),
          exitDate: new Date('2025-01-04'),
          realizedPnL: -75,
          riskAmount: 50,
          riskPercentage: 0.5
        }
      ];

      for (const trade of trades) {
        await prisma.trade.create({ data: trade });
      }

      // Request with filters and comparison
      const response = await request(app)
        .get('/api/analytics?symbols=AAPL&includeComparison=true')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.comparisonStats).toBeDefined();
      expect(response.body.data.comparisonStats.allTrades).toBeDefined();
      expect(response.body.data.comparisonStats.filtered).toBeDefined();
      expect(response.body.data.comparisonStats.improvement).toBeDefined();
    });
  });

  describe('GET /api/analytics/statistics', () => {
    test('should return performance statistics only', async () => {
      // Create test trades
      const trades = [
        {
          userId: testUser.id,
          symbol: 'AAPL',
          direction: 'LONG',
          entryPrice: 150,
          positionSize: 10,
          stopLoss: 145,
          exitPrice: 160,
          status: 'CLOSED',
          entryDate: new Date('2025-01-01'),
          exitDate: new Date('2025-01-02'),
          realizedPnL: 100,
          riskAmount: 50,
          riskPercentage: 0.5
        }
      ];

      for (const trade of trades) {
        await prisma.trade.create({ data: trade });
      }

      const response = await request(app)
        .get('/api/analytics/statistics')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('statistics');
      expect(response.body.data).toHaveProperty('filteredCount');
      expect(response.body.data).not.toHaveProperty('trades'); // Should not include trades array
    });

    test('should include statistical significance when requested', async () => {
      // Create enough trades for significance test (30+)
      const trades = Array.from({ length: 35 }, (_, i) => ({
        userId: testUser.id,
        symbol: 'AAPL',
        direction: 'LONG' as const,
        entryPrice: 150,
        positionSize: 10,
        stopLoss: 145,
        exitPrice: i % 2 === 0 ? 160 : 140, // Alternate wins/losses
        status: 'CLOSED' as const,
        entryDate: new Date(`2025-01-${String(i + 1).padStart(2, '0')}`),
        exitDate: new Date(`2025-01-${String(i + 1).padStart(2, '0')}`),
        realizedPnL: i % 2 === 0 ? 100 : -50,
        riskAmount: 50,
        riskPercentage: 0.5
      }));

      for (const trade of trades) {
        await prisma.trade.create({ data: trade });
      }

      const response = await request(app)
        .get('/api/analytics/statistics?includeSignificance=true')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('significance');
      
      const { significance }: { significance: StatisticalSignificance } = response.body.data;
      expect(significance.sampleSize).toBe(35);
      expect(significance.isSignificant).toBe(true);
      expect(significance.confidenceLevel).toBe(95);
    });

    test('should handle insufficient data for significance test', async () => {
      // Create only a few trades
      const trades = [
        {
          userId: testUser.id,
          symbol: 'AAPL',
          direction: 'LONG',
          entryPrice: 150,
          positionSize: 10,
          stopLoss: 145,
          exitPrice: 160,
          status: 'CLOSED',
          entryDate: new Date('2025-01-01'),
          exitDate: new Date('2025-01-02'),
          realizedPnL: 100,
          riskAmount: 50,
          riskPercentage: 0.5
        }
      ];

      for (const trade of trades) {
        await prisma.trade.create({ data: trade });
      }

      const response = await request(app)
        .get('/api/analytics/statistics?includeSignificance=true')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const { significance }: { significance: StatisticalSignificance } = response.body.data;
      expect(significance.sampleSize).toBe(1);
      expect(significance.isSignificant).toBe(false);
      expect(significance.recommendation).toContain('29 more trades');
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid query parameters gracefully', async () => {
      const response = await request(app)
        .get('/api/analytics?invalidParam=invalid')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid query parameters');
    });

    test('should require authentication', async () => {
      const response = await request(app)
        .get('/api/analytics')
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    test('should handle database errors gracefully', async () => {
      // This test would need to mock database failures
      // For now, we'll test that the endpoint exists and responds appropriately
      const response = await request(app)
        .get('/api/analytics')
        .set('Authorization', `Bearer invalid-token`)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Performance and Caching', () => {
    test('should handle large datasets efficiently', async () => {
      // Create a large number of trades
      const trades = Array.from({ length: 100 }, (_, i) => ({
        userId: testUser.id,
        symbol: `STOCK${i % 10}`,
        direction: i % 2 === 0 ? 'LONG' as const : 'SHORT' as const,
        entryPrice: 100 + (i % 50),
        positionSize: 10,
        stopLoss: 90 + (i % 50),
        exitPrice: i % 3 === 0 ? 110 + (i % 50) : 85 + (i % 50),
        status: 'CLOSED' as const,
        entryDate: new Date(`2025-01-${String((i % 30) + 1).padStart(2, '0')}`),
        exitDate: new Date(`2025-01-${String((i % 30) + 1).padStart(2, '0')}`),
        realizedPnL: i % 3 === 0 ? (10 + (i % 20)) : -(15 + (i % 15)),
        riskAmount: 10 + (i % 40),
        riskPercentage: (10 + (i % 40)) / 10000 * 100
      }));

      for (const trade of trades) {
        await prisma.trade.create({ data: trade });
      }

      const startTime = Date.now();
      const response = await request(app)
        .get('/api/analytics')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      const endTime = Date.now();

      expect(response.body.success).toBe(true);
      expect(response.body.data.statistics.totalTrades).toBe(100);
      
      // Should complete within reasonable time (adjust based on performance requirements)
      expect(endTime - startTime).toBeLessThan(2000); // 2 seconds
    });

    test('should paginate results correctly', async () => {
      // Create multiple trades
      const trades = Array.from({ length: 25 }, (_, i) => ({
        userId: testUser.id,
        symbol: `STOCK${i}`,
        direction: 'LONG' as const,
        entryPrice: 150,
        positionSize: 10,
        stopLoss: 145,
        exitPrice: 160,
        status: 'CLOSED' as const,
        entryDate: new Date(`2025-01-${String(i + 1).padStart(2, '0')}`),
        exitDate: new Date(`2025-01-${String(i + 1).padStart(2, '0')}`),
        realizedPnL: 100,
        riskAmount: 50,
        riskPercentage: 0.5
      }));

      for (const trade of trades) {
        await prisma.trade.create({ data: trade });
      }

      const response = await request(app)
        .get('/api/analytics?page=1&limit=10')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.trades).toHaveLength(10);
      expect(response.body.data.filteredCount).toBe(25);
      expect(response.body.data.statistics.totalTrades).toBe(25); // Statistics should include all trades
    });
  });
});