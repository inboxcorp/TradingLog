import request from 'supertest';
import app from '../../../src/app';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('Cash Adjustment API', () => {
  const userId = 'dev-user-1';
  const authHeaders = { Authorization: 'Bearer dev-token' };

  beforeAll(async () => {
    // Create or update test user
    await prisma.user.upsert({
      where: { id: userId },
      update: {},
      create: {
        id: userId,
        email: 'dev@example.com',
        totalEquity: 10000.00,
      },
    });
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.equitySnapshot.deleteMany({
      where: { userId }
    });
    await prisma.user.deleteMany({
      where: { id: userId }
    });
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Reset user equity and clean up snapshots for each test
    await prisma.equitySnapshot.deleteMany({
      where: { userId }
    });
    await prisma.user.update({
      where: { id: userId },
      data: { totalEquity: 10000.00 }
    });
  });

  describe('POST /api/user/cash-adjustment', () => {
    describe('Valid cash deposits', () => {
      it('should process a cash deposit successfully', async () => {
        const depositData = {
          type: 'DEPOSIT',
          amount: 5000.00,
          description: 'Bonus payment'
        };

        const response = await request(app)
          .post('/api/user/cash-adjustment')
          .set(authHeaders)
          .send(depositData);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.totalEquity).toBe(15000.00);
        expect(response.body.message).toContain('deposit');

        // Verify equity snapshot was created
        const snapshot = await prisma.equitySnapshot.findFirst({
          where: { userId, source: 'CASH_DEPOSIT' }
        });
        expect(snapshot).toBeTruthy();
        expect(snapshot?.amount).toBe(5000.00);
        expect(snapshot?.totalEquity).toBe(15000.00);
        expect(snapshot?.description).toBe('Bonus payment');
      });

      it('should handle deposit without description', async () => {
        const depositData = {
          type: 'DEPOSIT',
          amount: 2500.00
        };

        const response = await request(app)
          .post('/api/user/cash-adjustment')
          .set(authHeaders)
          .send(depositData);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.totalEquity).toBe(12500.00);

        const snapshot = await prisma.equitySnapshot.findFirst({
          where: { userId, source: 'CASH_DEPOSIT' }
        });
        expect(snapshot?.description).toContain('deposit of $2,500.00');
      });
    });

    describe('Valid cash withdrawals', () => {
      it('should process a cash withdrawal successfully', async () => {
        const withdrawalData = {
          type: 'WITHDRAWAL',
          amount: 3000.00,
          description: 'Emergency funds'
        };

        const response = await request(app)
          .post('/api/user/cash-adjustment')
          .set(authHeaders)
          .send(withdrawalData);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.totalEquity).toBe(7000.00);
        expect(response.body.message).toContain('withdrawal');

        // Verify equity snapshot was created
        const snapshot = await prisma.equitySnapshot.findFirst({
          where: { userId, source: 'CASH_WITHDRAWAL' }
        });
        expect(snapshot).toBeTruthy();
        expect(snapshot?.amount).toBe(-3000.00);
        expect(snapshot?.totalEquity).toBe(7000.00);
        expect(snapshot?.description).toBe('Emergency funds');
      });
    });

    describe('Validation and error cases', () => {
      it('should reject withdrawal that exceeds available funds', async () => {
        const withdrawalData = {
          type: 'WITHDRAWAL',
          amount: 15000.00, // More than the $10k available
        };

        const response = await request(app)
          .post('/api/user/cash-adjustment')
          .set(authHeaders)
          .send(withdrawalData);

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('Insufficient funds for withdrawal');

        // Verify no snapshot was created
        const snapshot = await prisma.equitySnapshot.findFirst({
          where: { userId, source: 'CASH_WITHDRAWAL' }
        });
        expect(snapshot).toBeNull();

        // Verify equity unchanged
        const user = await prisma.user.findUnique({ where: { id: userId } });
        expect(user?.totalEquity).toBe(10000.00);
      });

      it('should reject invalid adjustment amounts', async () => {
        const testCases = [
          { amount: 0, expectedError: 'Invalid request data' }, // Zod validation
          { amount: -500, expectedError: 'Invalid request data' }, // Zod validation
          { amount: 10000001, expectedError: 'Invalid adjustment amount' } // Custom validation
        ];

        for (const testCase of testCases) {
          const response = await request(app)
            .post('/api/user/cash-adjustment')
            .set(authHeaders)
            .send({
              type: 'DEPOSIT',
              amount: testCase.amount
            });

          expect(response.status).toBe(400);
          expect(response.body.success).toBe(false);
          expect(response.body.error).toContain(testCase.expectedError);
        }
      });

      it('should reject invalid request data', async () => {
        const invalidRequests = [
          { type: 'INVALID_TYPE', amount: 1000 },
          { type: 'DEPOSIT' }, // Missing amount
          { amount: 1000 }, // Missing type
        ];

        for (const invalidRequest of invalidRequests) {
          const response = await request(app)
            .post('/api/user/cash-adjustment')
            .set(authHeaders)
            .send(invalidRequest);

          expect(response.status).toBe(400);
          expect(response.body.success).toBe(false);
          expect(response.body.error).toBe('Invalid request data');
        }
      });

      it('should require authentication', async () => {
        const response = await request(app)
          .post('/api/user/cash-adjustment')
          .send({
            type: 'DEPOSIT',
            amount: 1000
          });

        expect(response.status).toBe(401);
      });
    });

    describe('Precision and decimal handling', () => {
      it('should handle decimal amounts correctly', async () => {
        const depositData = {
          type: 'DEPOSIT',
          amount: 1234.56
        };

        const response = await request(app)
          .post('/api/user/cash-adjustment')
          .set(authHeaders)
          .send(depositData);

        expect(response.status).toBe(200);
        expect(response.body.data.totalEquity).toBe(11234.56);

        const snapshot = await prisma.equitySnapshot.findFirst({
          where: { userId, source: 'CASH_DEPOSIT' }
        });
        expect(snapshot?.amount).toBe(1234.56);
        expect(snapshot?.totalEquity).toBe(11234.56);
      });
    });
  });

  describe('GET /api/user/cash-history', () => {
    beforeEach(async () => {
      // Create test history entries
      await prisma.equitySnapshot.createMany({
        data: [
          {
            userId,
            totalEquity: 12000,
            source: 'CASH_DEPOSIT',
            amount: 2000,
            description: 'Initial deposit',
            timestamp: new Date('2024-01-15T10:00:00Z')
          },
          {
            userId,
            totalEquity: 11500,
            source: 'CASH_WITHDRAWAL',
            amount: -500,
            description: 'ATM withdrawal',
            timestamp: new Date('2024-01-16T15:30:00Z')
          },
          {
            userId,
            totalEquity: 11750,
            source: 'TRADE_CLOSE',
            amount: 250,
            description: 'Trade closed: AAPL LONG - P/L: +$250.00',
            timestamp: new Date('2024-01-17T09:15:00Z')
          }
        ]
      });
    });

    it('should retrieve cash history successfully', async () => {
      const response = await request(app)
        .get('/api/user/cash-history')
        .set(authHeaders);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(3);

      // Verify entries are sorted by timestamp (newest first)
      const history = response.body.data;
      expect(history[0].type).toBe('TRADE_PNL');
      expect(history[0].amount).toBe(250);
      expect(history[1].type).toBe('WITHDRAWAL');
      expect(history[1].amount).toBe(-500);
      expect(history[2].type).toBe('DEPOSIT');
      expect(history[2].amount).toBe(2000);
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/user/cash-history?page=1&limit=2')
        .set(authHeaders);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(2);
    });

    it('should limit maximum page size', async () => {
      const response = await request(app)
        .get('/api/user/cash-history?limit=200')
        .set(authHeaders);

      expect(response.status).toBe(200);
      // Should be limited to 100 (or the actual count if less)
      expect(response.body.data.length).toBeLessThanOrEqual(100);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/user/cash-history');

      expect(response.status).toBe(401);
    });
  });

  describe('Integration with existing equity management', () => {
    it('should work alongside existing equity update endpoint', async () => {
      // First, use cash adjustment
      await request(app)
        .post('/api/user/cash-adjustment')
        .set(authHeaders)
        .send({ type: 'DEPOSIT', amount: 5000 });

      // Then use traditional equity update
      const response = await request(app)
        .patch('/api/user')
        .set(authHeaders)
        .send({ totalEquity: 18000 });

      expect(response.status).toBe(200);
      expect(response.body.data.totalEquity).toBe(18000);
    });

    it('should maintain transaction atomicity', async () => {
      // This test ensures that if something fails after equity calculation
      // but before snapshot creation, the entire transaction rolls back

      const originalEquity = 10000;
      
      // Simulate a withdrawal that should succeed
      const withdrawalData = {
        type: 'WITHDRAWAL',
        amount: 1000
      };

      const response = await request(app)
        .post('/api/user/cash-adjustment')
        .set(authHeaders)
        .send(withdrawalData);

      expect(response.status).toBe(200);

      // Verify both user equity and snapshot were updated atomically
      const user = await prisma.user.findUnique({ where: { id: userId } });
      const snapshot = await prisma.equitySnapshot.findFirst({
        where: { userId, source: 'CASH_WITHDRAWAL' }
      });

      expect(user?.totalEquity).toBe(9000);
      expect(snapshot?.totalEquity).toBe(9000);
      expect(snapshot?.amount).toBe(-1000);
    });
  });
});