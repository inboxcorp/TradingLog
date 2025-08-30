import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import app from '../../../src/app';

const prisma = new PrismaClient();

describe('Trades API', () => {
  const testUserId = 'dev-user-1';
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
    
    // Reset user equity to $100k for each test
    await prisma.user.update({
      where: { id: testUserId },
      data: { totalEquity: 100000 },
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
          riskPercentage: 1.5,
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
          riskPercentage: 1.0,
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
            riskPercentage: 0.5,
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
            riskPercentage: 0.5,
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
          riskPercentage: 0.05,
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

  describe('POST /api/trades/:tradeId/close', () => {
    let activeTradeId: string;
    let closedTradeId: string;

    beforeEach(async () => {
      // Create an active trade to close
      const activeTrade = await prisma.trade.create({
        data: {
          userId: testUserId,
          symbol: 'AAPL',
          direction: 'LONG',
          entryPrice: 150.00,
          positionSize: 100,
          stopLoss: 145.00,
          status: 'ACTIVE',
          entryDate: new Date(),
          riskAmount: 500,
          riskPercentage: 0.5,
        },
      });
      activeTradeId = activeTrade.id;

      // Create an already closed trade
      const closedTrade = await prisma.trade.create({
        data: {
          userId: testUserId,
          symbol: 'TSLA',
          direction: 'SHORT',
          entryPrice: 200.00,
          positionSize: 50,
          stopLoss: 210.00,
          exitPrice: 180.00,
          status: 'CLOSED',
          entryDate: new Date(),
          exitDate: new Date(),
          realizedPnL: 1000,
          riskAmount: 500,
          riskPercentage: 0.5,
        },
      });
      closedTradeId = closedTrade.id;
    });

    it('should close an active LONG trade with profit', async () => {
      const exitPrice = 160.00; // Entry was 150, so profit = (160-150) * 100 = 1000

      const response = await request(app)
        .post(`/api/trades/${activeTradeId}/close`)
        .set(authHeaders)
        .send({ exitPrice })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        id: activeTradeId,
        status: 'CLOSED',
        exitPrice: 160.00,
        realizedPnL: 1000, // (160 - 150) * 100
      });
      expect(response.body.data.exitDate).toBeTruthy();

      // Verify database was updated
      const updatedTrade = await prisma.trade.findUnique({
        where: { id: activeTradeId },
      });
      expect(updatedTrade?.status).toBe('CLOSED');
      expect(updatedTrade?.exitPrice).toBe(160.00);
      expect(updatedTrade?.realizedPnL).toBe(1000);
      expect(updatedTrade?.exitDate).toBeTruthy();

      // Verify user equity was updated
      const updatedUser = await prisma.user.findUnique({
        where: { id: testUserId },
      });
      expect(updatedUser?.totalEquity).toBe(101000); // 100000 + 1000 profit

      // Verify equity snapshot was created
      const snapshot = await prisma.equitySnapshot.findFirst({
        where: { userId: testUserId, source: 'TRADE_CLOSE' },
        orderBy: { timestamp: 'desc' },
      });
      expect(snapshot).toBeTruthy();
      expect(snapshot?.totalEquity).toBe(101000);
    });

    it('should close an active LONG trade with loss', async () => {
      const exitPrice = 140.00; // Entry was 150, so loss = (140-150) * 100 = -1000

      const response = await request(app)
        .post(`/api/trades/${activeTradeId}/close`)
        .set(authHeaders)
        .send({ exitPrice })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.realizedPnL).toBe(-1000);

      // Verify user equity was updated (decreased)
      const updatedUser = await prisma.user.findUnique({
        where: { id: testUserId },
      });
      expect(updatedUser?.totalEquity).toBe(99000); // 100000 - 1000 loss
    });

    it('should close an active SHORT trade with profit', async () => {
      // Create a SHORT trade
      const shortTrade = await prisma.trade.create({
        data: {
          userId: testUserId,
          symbol: 'GOOGL',
          direction: 'SHORT',
          entryPrice: 100.00,
          positionSize: 50,
          stopLoss: 105.00,
          status: 'ACTIVE',
          entryDate: new Date(),
          riskAmount: 250,
          riskPercentage: 0.25,
        },
      });

      const exitPrice = 90.00; // Entry was 100, so profit = (100-90) * 50 = 500

      const response = await request(app)
        .post(`/api/trades/${shortTrade.id}/close`)
        .set(authHeaders)
        .send({ exitPrice })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.realizedPnL).toBe(500);
    });

    it('should close an active SHORT trade with loss', async () => {
      // Create a SHORT trade
      const shortTrade = await prisma.trade.create({
        data: {
          userId: testUserId,
          symbol: 'AMZN',
          direction: 'SHORT',
          entryPrice: 100.00,
          positionSize: 50,
          stopLoss: 105.00,
          status: 'ACTIVE',
          entryDate: new Date(),
          riskAmount: 250,
          riskPercentage: 0.25,
        },
      });

      const exitPrice = 110.00; // Entry was 100, so loss = (100-110) * 50 = -500

      const response = await request(app)
        .post(`/api/trades/${shortTrade.id}/close`)
        .set(authHeaders)
        .send({ exitPrice })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.realizedPnL).toBe(-500);
    });

    it('should handle break-even trades (zero P/L)', async () => {
      const exitPrice = 150.00; // Same as entry price

      const response = await request(app)
        .post(`/api/trades/${activeTradeId}/close`)
        .set(authHeaders)
        .send({ exitPrice })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.realizedPnL).toBe(0);

      // User equity should remain the same
      const updatedUser = await prisma.user.findUnique({
        where: { id: testUserId },
      });
      expect(updatedUser?.totalEquity).toBe(100000); // No change
    });

    it('should handle decimal precision correctly', async () => {
      // Create trade with decimal prices
      const decimalTrade = await prisma.trade.create({
        data: {
          userId: testUserId,
          symbol: 'PREC',
          direction: 'LONG',
          entryPrice: 100.123,
          positionSize: 333,
          stopLoss: 99.987,
          status: 'ACTIVE',
          entryDate: new Date(),
          riskAmount: 45.288,
          riskPercentage: 0.045,
        },
      });

      const exitPrice = 101.456;
      // Expected P/L: (101.456 - 100.123) * 333 = 1.333 * 333 = 443.889

      const response = await request(app)
        .post(`/api/trades/${decimalTrade.id}/close`)
        .set(authHeaders)
        .send({ exitPrice })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.realizedPnL).toBeCloseTo(443.889, 3);

      // Verify user equity precision
      const updatedUser = await prisma.user.findUnique({
        where: { id: testUserId },
      });
      expect(updatedUser?.totalEquity).toBeCloseTo(100443.889, 3);
    });

    it('should reject closing non-existent trade', async () => {
      const fakeTradeId = 'fake-trade-id';

      const response = await request(app)
        .post(`/api/trades/${fakeTradeId}/close`)
        .set(authHeaders)
        .send({ exitPrice: 100 })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Trade not found');
    });

    it('should reject closing already closed trade', async () => {
      const response = await request(app)
        .post(`/api/trades/${closedTradeId}/close`)
        .set(authHeaders)
        .send({ exitPrice: 100 })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Trade not found');
      expect(response.body.message).toContain('already closed');
    });

    it('should reject closing trade of different user', async () => {
      // Create trade for different user
      const otherUserId = 'other-user-close';
      await prisma.user.upsert({
        where: { id: otherUserId },
        update: { totalEquity: 50000 },
        create: {
          id: otherUserId,
          email: 'other-close@example.com',
          totalEquity: 50000,
        },
      });

      const otherUserTrade = await prisma.trade.create({
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
          riskPercentage: 0.05,
        },
      });

      const response = await request(app)
        .post(`/api/trades/${otherUserTrade.id}/close`)
        .set(authHeaders)
        .send({ exitPrice: 105 })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Trade not found');

      // Clean up
      await prisma.trade.delete({ where: { id: otherUserTrade.id } });
      await prisma.user.delete({ where: { id: otherUserId } });
    });

    it('should validate exit price input', async () => {
      // Test invalid exit prices
      const invalidPrices = [
        { exitPrice: -100, description: 'negative price' },
        { exitPrice: 0, description: 'zero price' },
        { exitPrice: 'invalid', description: 'non-numeric price' },
      ];

      for (const { exitPrice, description } of invalidPrices) {
        const response = await request(app)
          .post(`/api/trades/${activeTradeId}/close`)
          .set(authHeaders)
          .send({ exitPrice })
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('Invalid request data');
      }
    });

    it('should require authentication', async () => {
      await request(app)
        .post(`/api/trades/${activeTradeId}/close`)
        .send({ exitPrice: 160 })
        .expect(401);
    });

    it('should handle database transaction rollback on error', async () => {
      // This test ensures atomicity - if any part of the transaction fails,
      // everything should be rolled back
      
      // Create a user and trade, then delete the user to simulate error
      const errorUserId = 'error-test-user';
      await prisma.user.create({
        data: {
          id: errorUserId,
          email: 'error-test@example.com',
          totalEquity: 10000,
        },
      });

      const invalidTrade = await prisma.trade.create({
        data: {
          userId: errorUserId,
          symbol: 'ERROR',
          direction: 'LONG',
          entryPrice: 100,
          positionSize: 10,
          stopLoss: 95,
          status: 'ACTIVE',
          entryDate: new Date(),
          riskAmount: 50,
          riskPercentage: 0.05,
        },
      });

      // Delete the user to cause a foreign key constraint error
      await prisma.user.delete({ where: { id: errorUserId } });

      // Try to close the trade - this should fail because user doesn't exist
      const response = await request(app)
        .post(`/api/trades/${invalidTrade.id}/close`)
        .set(authHeaders)
        .send({ exitPrice: 105 })
        .expect(500);

      expect(response.body.success).toBe(false);

      // Verify the trade status wasn't changed
      const unchangedTrade = await prisma.trade.findUnique({
        where: { id: invalidTrade.id },
      });
      expect(unchangedTrade?.status).toBe('ACTIVE');
      expect(unchangedTrade?.exitPrice).toBeNull();
      expect(unchangedTrade?.realizedPnL).toBeNull();

      // Clean up
      await prisma.trade.delete({ where: { id: invalidTrade.id } });
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