import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import app from '../../../src/app';

const prisma = new PrismaClient();

describe('Adjust Stop-Loss API', () => {
  const testUserId = 'dev-user-1';
  const authHeaders = { Authorization: 'Bearer dev-token' };
  let testTradeId: string;

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
    // Clean up trades and create test trade
    await prisma.trade.deleteMany({
      where: { userId: testUserId },
    });
    
    // Create active LONG trade for testing
    const trade = await prisma.trade.create({
      data: {
        userId: testUserId,
        symbol: 'AAPL',
        direction: 'LONG',
        entryPrice: 150.00,
        positionSize: 100,
        stopLoss: 145.00,
        status: 'ACTIVE',
        entryDate: new Date(),
        riskAmount: 500, // (150 - 145) * 100
        riskPercentage: 0.5, // 500/100000 * 100
      }
    });
    testTradeId = trade.id;
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

  describe('PATCH /api/trades/:tradeId', () => {
    describe('LONG position adjustments', () => {
      it('should adjust stop-loss higher (risk reduction)', async () => {
        const response = await request(app)
          .patch(`/api/trades/${testTradeId}`)
          .set(authHeaders)
          .send({ stopLoss: 147.00 })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toMatchObject({
          id: testTradeId,
          stopLoss: 147.00,
          riskAmount: 300, // (150 - 147) * 100 = 300
          riskPercentage: 0.3, // 300/100000 * 100 = 0.3%
        });

        // Verify in database
        const updatedTrade = await prisma.trade.findUnique({
          where: { id: testTradeId },
        });
        expect(updatedTrade?.stopLoss).toBe(147.00);
        expect(updatedTrade?.riskAmount).toBe(300);
      });

      it('should allow profit locking (stop above entry)', async () => {
        const response = await request(app)
          .patch(`/api/trades/${testTradeId}`)
          .set(authHeaders)
          .send({ stopLoss: 152.00 })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toMatchObject({
          stopLoss: 152.00,
          riskAmount: 200, // |150 - 152| * 100 = 200
        });
      });

      it('should reject stop-loss lower than current (increased risk)', async () => {
        const response = await request(app)
          .patch(`/api/trades/${testTradeId}`)
          .set(authHeaders)
          .send({ stopLoss: 143.00 })
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('Stop-loss adjustment validation failed');
        expect(response.body.message).toContain('must be higher');
      });

      it('should reject same stop-loss price', async () => {
        const response = await request(app)
          .patch(`/api/trades/${testTradeId}`)
          .set(authHeaders)
          .send({ stopLoss: 145.00 })
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('must be higher');
      });
    });

    describe('SHORT position adjustments', () => {
      beforeEach(async () => {
        // Update trade to SHORT position
        await prisma.trade.update({
          where: { id: testTradeId },
          data: {
            direction: 'SHORT',
            entryPrice: 100.00,
            stopLoss: 105.00,
            riskAmount: 500, // |100 - 105| * 100 = 500
          }
        });
      });

      it('should adjust stop-loss lower (risk reduction)', async () => {
        const response = await request(app)
          .patch(`/api/trades/${testTradeId}`)
          .set(authHeaders)
          .send({ stopLoss: 103.00 })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toMatchObject({
          stopLoss: 103.00,
          riskAmount: 300, // |100 - 103| * 100 = 300
        });
      });

      it('should allow profit locking (stop below entry)', async () => {
        const response = await request(app)
          .patch(`/api/trades/${testTradeId}`)
          .set(authHeaders)
          .send({ stopLoss: 98.00 })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toMatchObject({
          stopLoss: 98.00,
          riskAmount: 200, // |100 - 98| * 100 = 200
        });
      });

      it('should reject stop-loss higher than current (increased risk)', async () => {
        const response = await request(app)
          .patch(`/api/trades/${testTradeId}`)
          .set(authHeaders)
          .send({ stopLoss: 107.00 })
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('must be lower');
      });
    });

    describe('Error cases', () => {
      it('should handle non-existent trade', async () => {
        const response = await request(app)
          .patch('/api/trades/non-existent-id')
          .set(authHeaders)
          .send({ stopLoss: 147.00 })
          .expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('Trade not found');
      });

      it('should handle closed trade', async () => {
        // Close the trade first
        await prisma.trade.update({
          where: { id: testTradeId },
          data: { status: 'CLOSED' }
        });

        const response = await request(app)
          .patch(`/api/trades/${testTradeId}`)
          .set(authHeaders)
          .send({ stopLoss: 147.00 })
          .expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('Trade not found');
      });

      it('should validate positive stop-loss', async () => {
        const response = await request(app)
          .patch(`/api/trades/${testTradeId}`)
          .set(authHeaders)
          .send({ stopLoss: -10 })
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('Invalid request data');
      });

      it('should handle unauthorized access', async () => {
        const response = await request(app)
          .patch(`/api/trades/${testTradeId}`)
          .send({ stopLoss: 147.00 })
          .expect(401);
      });
    });

    describe('Risk recalculation precision', () => {
      it('should handle decimal precision correctly', async () => {
        const response = await request(app)
          .patch(`/api/trades/${testTradeId}`)
          .set(authHeaders)
          .send({ stopLoss: 147.50 })
          .expect(200);

        expect(response.body.data.riskAmount).toBeCloseTo(250, 2); // (150 - 147.5) * 100
        expect(response.body.data.riskPercentage).toBeCloseTo(0.25, 2); // 250/100000 * 100
      });

      it('should update risk percentage based on current equity', async () => {
        // Change user equity
        await prisma.user.update({
          where: { id: testUserId },
          data: { totalEquity: 50000 } // Half the equity
        });

        const response = await request(app)
          .patch(`/api/trades/${testTradeId}`)
          .set(authHeaders)
          .send({ stopLoss: 147.00 })
          .expect(200);

        expect(response.body.data.riskAmount).toBe(300); // Same risk amount
        expect(response.body.data.riskPercentage).toBeCloseTo(0.6, 2); // But higher percentage: 300/50000 * 100
      });
    });
  });
});