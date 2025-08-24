import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import app from '../../../src/app';

const prisma = new PrismaClient();

describe('Trades API', () => {
  const testUserId = 'test-user-1';
  const authHeaders = { Authorization: 'Bearer dev-token' };

  beforeAll(async () => {
    // Create test user
    await prisma.user.upsert({
      where: { id: testUserId },
      update: {},
      create: {
        id: testUserId,
        email: 'test@example.com',
        totalEquity: 100000, // $100k for testing
      },
    });
  });

  beforeEach(async () => {
    // Clean up trades before each test
    await prisma.trade.deleteMany({
      where: { userId: testUserId },
    });
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.trade.deleteMany({
      where: { userId: testUserId },
    });
    await prisma.user.delete({
      where: { id: testUserId },
    });
    await prisma.$disconnect();
  });

  describe('POST /api/trades', () => {
    it('should create a new trade successfully', async () => {
      const tradeData = {
        symbol: 'AAPL',
        direction: 'LONG',
        entryPrice: 150.00,
        positionSize: 100,
        stopLoss: 145.00,
        notes: 'Test trade',
      };

      const response = await request(app)
        .post('/api/trades')
        .set(authHeaders)
        .send(tradeData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        symbol: 'AAPL',
        direction: 'LONG',
        entryPrice: 150.00,
        positionSize: 100,
        stopLoss: 145.00,
        status: 'ACTIVE',
        riskAmount: 500, // (150 - 145) * 100 = 500
        notes: 'Test trade',
      });

      // Verify trade was saved in database
      const savedTrade = await prisma.trade.findFirst({
        where: { symbol: 'AAPL', userId: testUserId },
      });
      expect(savedTrade).toBeTruthy();
      expect(savedTrade?.riskAmount).toBe(500);
    });

    it('should validate individual trade risk (2% limit)', async () => {
      const tradeData = {
        symbol: 'TSLA',
        direction: 'LONG',
        entryPrice: 200.00,
        positionSize: 200, // Risk = (200-180) * 200 = 4000 > 2% of 100k = 2000
        stopLoss: 180.00,
      };

      const response = await request(app)
        .post('/api/trades')
        .set(authHeaders)
        .send(tradeData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Risk limit exceeded');
      expect(response.body.message).toContain('exceeds 2% limit');
    });

    it('should validate portfolio risk (6% limit)', async () => {
      // Create first trade (risk = 1500)
      await prisma.trade.create({
        data: {
          userId: testUserId,
          symbol: 'MSFT',
          direction: 'LONG',
          entryPrice: 300,
          positionSize: 100,
          stopLoss: 285,
          status: 'ACTIVE',
          entryDate: new Date(),
          riskAmount: 1500,
        },
      });

      // Create second trade (risk = 1000)
      await prisma.trade.create({
        data: {
          userId: testUserId,
          symbol: 'GOOGL',
          direction: 'LONG',
          entryPrice: 150,
          positionSize: 100,
          stopLoss: 140,
          status: 'ACTIVE',
          entryDate: new Date(),
          riskAmount: 1000,
        },
      });

      // Try to create third trade that would exceed 6% limit
      // Current portfolio risk: 2500, new trade risk: 4000
      // Total would be 6500 > 6% of 100k = 6000
      const tradeData = {
        symbol: 'AMZN',
        direction: 'SHORT',
        entryPrice: 100,
        positionSize: 100,
        stopLoss: 140, // Risk = (140-100) * 100 = 4000
      };

      const response = await request(app)
        .post('/api/trades')
        .set(authHeaders)
        .send(tradeData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Risk limit exceeded');
      expect(response.body.message).toContain('portfolio risk');
      expect(response.body.message).toContain('6% limit');
    });

    it('should validate input data', async () => {
      const invalidTradeData = {
        symbol: '', // Invalid empty symbol
        direction: 'INVALID',
        entryPrice: -100,
        positionSize: 0,
        stopLoss: -50,
      };

      const response = await request(app)
        .post('/api/trades')
        .set(authHeaders)
        .send(invalidTradeData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid request data');
    });

    it('should require authentication', async () => {
      const tradeData = {
        symbol: 'AAPL',
        direction: 'LONG',
        entryPrice: 150.00,
        positionSize: 100,
        stopLoss: 145.00,
      };

      await request(app)
        .post('/api/trades')
        .send(tradeData)
        .expect(401);
    });
  });

  describe('GET /api/trades', () => {
    beforeEach(async () => {
      // Create test trades
      await prisma.trade.createMany({
        data: [
          {
            userId: testUserId,
            symbol: 'AAPL',
            direction: 'LONG',
            entryPrice: 150,
            positionSize: 100,
            stopLoss: 145,
            status: 'ACTIVE',
            entryDate: new Date(),
            riskAmount: 500,
          },
          {
            userId: testUserId,
            symbol: 'TSLA',
            direction: 'SHORT',
            entryPrice: 200,
            positionSize: 50,
            stopLoss: 210,
            exitPrice: 190,
            status: 'CLOSED',
            entryDate: new Date(),
            exitDate: new Date(),
            realizedPnL: 500,
            riskAmount: 500,
          },
        ],
      });
    });

    it('should return all trades by default', async () => {
      const response = await request(app)
        .get('/api/trades')
        .set(authHeaders)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0]).toHaveProperty('symbol');
      expect(response.body.data[0]).toHaveProperty('direction');
      expect(response.body.data[0]).toHaveProperty('riskAmount');
    });

    it('should filter trades by status', async () => {
      const activeResponse = await request(app)
        .get('/api/trades?status=ACTIVE')
        .set(authHeaders)
        .expect(200);

      expect(activeResponse.body.data).toHaveLength(1);
      expect(activeResponse.body.data[0].status).toBe('ACTIVE');
      expect(activeResponse.body.data[0].symbol).toBe('AAPL');

      const closedResponse = await request(app)
        .get('/api/trades?status=CLOSED')
        .set(authHeaders)
        .expect(200);

      expect(closedResponse.body.data).toHaveLength(1);
      expect(closedResponse.body.data[0].status).toBe('CLOSED');
      expect(closedResponse.body.data[0].symbol).toBe('TSLA');
    });

    it('should require authentication', async () => {
      await request(app)
        .get('/api/trades')
        .expect(401);
    });

    it('should only return trades for authenticated user', async () => {
      // Create trade for different user
      const otherUserId = 'other-user';
      await prisma.user.create({
        data: {
          id: otherUserId,
          email: 'other@example.com',
          totalEquity: 50000,
        },
      });

      await prisma.trade.create({
        data: {
          userId: otherUserId,
          symbol: 'OTHER',
          direction: 'LONG',
          entryPrice: 100,
          positionSize: 10,
          stopLoss: 95,
          status: 'ACTIVE',
          entryDate: new Date(),
          riskAmount: 50,
        },
      });

      const response = await request(app)
        .get('/api/trades')
        .set(authHeaders)
        .expect(200);

      // Should only return trades for the authenticated user (testUserId)
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data.every((trade: any) => trade.userId === testUserId)).toBe(true);

      // Clean up
      await prisma.trade.deleteMany({ where: { userId: otherUserId } });
      await prisma.user.delete({ where: { id: otherUserId } });
    });
  });

  describe('Risk Calculation Precision', () => {
    it('should handle decimal precision correctly', async () => {
      const tradeData = {
        symbol: 'PREC',
        direction: 'LONG',
        entryPrice: 100.123,
        positionSize: 333,
        stopLoss: 99.987,
      };

      const response = await request(app)
        .post('/api/trades')
        .set(authHeaders)
        .send(tradeData)
        .expect(201);

      // Expected risk: (100.123 - 99.987) * 333 = 0.136 * 333 = 45.288
      expect(response.body.data.riskAmount).toBeCloseTo(45.288, 3);
    });
  });
});