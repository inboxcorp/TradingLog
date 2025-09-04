import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import app from '../../../src/app';
import { MindsetTagType, IntensityLevel } from '@trading-log/shared';

const prisma = new PrismaClient();
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
      totalEquity: 10000,
    },
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

describe('Mindset Tags API', () => {
  describe('POST /api/trades with mindset tags', () => {
    test('should create trade with mindset tags', async () => {
      const tradeData = {
        symbol: 'AAPL',
        direction: 'LONG',
        entryPrice: 150,
        positionSize: 10,
        stopLoss: 145,
        notes: 'Test trade with mindset',
        mindsetTags: [
          { tag: MindsetTagType.DISCIPLINED, intensity: IntensityLevel.HIGH },
          { tag: MindsetTagType.FOCUSED, intensity: IntensityLevel.MEDIUM }
        ]
      };

      const response = await request(app)
        .post('/api/trades')
        .set(authHeaders)
        .send(tradeData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.symbol).toBe('AAPL');
      
      // Check that mindset tags are included in response
      expect(response.body.data.mindsetTags).toBeDefined();
      expect(response.body.data.mindsetTags).toHaveLength(2);
      
      const disciplinedTag = response.body.data.mindsetTags.find(
        (tag: any) => tag.tag === MindsetTagType.DISCIPLINED
      );
      expect(disciplinedTag).toBeDefined();
      expect(disciplinedTag.intensity).toBe(IntensityLevel.HIGH);
      
      const focusedTag = response.body.data.mindsetTags.find(
        (tag: any) => tag.tag === MindsetTagType.FOCUSED
      );
      expect(focusedTag).toBeDefined();
      expect(focusedTag.intensity).toBe(IntensityLevel.MEDIUM);
    });

    test('should reject duplicate mindset tags', async () => {
      const tradeData = {
        symbol: 'TSLA',
        direction: 'LONG',
        entryPrice: 200,
        positionSize: 5,
        stopLoss: 190,
        mindsetTags: [
          { tag: MindsetTagType.DISCIPLINED, intensity: IntensityLevel.HIGH },
          { tag: MindsetTagType.DISCIPLINED, intensity: IntensityLevel.LOW } // Duplicate
        ]
      };

      const response = await request(app)
        .post('/api/trades')
        .set(authHeaders)
        .send(tradeData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Duplicate mindset tags');
    });

    test('should reject too many mindset tags', async () => {
      const tradeData = {
        symbol: 'MSFT',
        direction: 'LONG',
        entryPrice: 300,
        positionSize: 3,
        stopLoss: 290,
        mindsetTags: [
          { tag: MindsetTagType.DISCIPLINED, intensity: IntensityLevel.HIGH },
          { tag: MindsetTagType.FOCUSED, intensity: IntensityLevel.MEDIUM },
          { tag: MindsetTagType.CONFIDENT, intensity: IntensityLevel.LOW },
          { tag: MindsetTagType.PATIENT, intensity: IntensityLevel.HIGH },
          { tag: MindsetTagType.CALM, intensity: IntensityLevel.MEDIUM },
          { tag: MindsetTagType.ANALYTICAL, intensity: IntensityLevel.LOW } // 6 tags, max is 5
        ]
      };

      const response = await request(app)
        .post('/api/trades')
        .set(authHeaders)
        .send(tradeData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Maximum of 5 mindset tags');
    });
  });

  describe('PATCH /api/trades/:tradeId/mindset', () => {
    let tradeId: string;

    beforeEach(async () => {
      // Create a test trade first
      const tradeData = {
        symbol: 'GOOGL',
        direction: 'LONG',
        entryPrice: 2500,
        positionSize: 1,
        stopLoss: 2400,
      };

      const response = await request(app)
        .post('/api/trades')
        .set(authHeaders)
        .send(tradeData)
        .expect(201);

      tradeId = response.body.data.id;
    });

    test('should update mindset tags for existing trade', async () => {
      const updateData = {
        tags: [
          { tag: MindsetTagType.ANXIOUS, intensity: IntensityLevel.MEDIUM },
          { tag: MindsetTagType.UNCERTAIN, intensity: IntensityLevel.HIGH }
        ]
      };

      const response = await request(app)
        .patch(`/api/trades/${tradeId}/mindset`)
        .set(authHeaders)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.mindsetTags).toHaveLength(2);
      
      const anxiousTag = response.body.data.mindsetTags.find(
        (tag: any) => tag.tag === MindsetTagType.ANXIOUS
      );
      expect(anxiousTag).toBeDefined();
      expect(anxiousTag.intensity).toBe(IntensityLevel.MEDIUM);
    });

    test('should clear mindset tags when empty array is provided', async () => {
      // First add some tags
      await request(app)
        .patch(`/api/trades/${tradeId}/mindset`)
        .set(authHeaders)
        .send({
          tags: [{ tag: MindsetTagType.DISCIPLINED, intensity: IntensityLevel.HIGH }]
        })
        .expect(200);

      // Then clear them
      const response = await request(app)
        .patch(`/api/trades/${tradeId}/mindset`)
        .set(authHeaders)
        .send({ tags: [] })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.mindsetTags).toHaveLength(0);
    });

    test('should return 404 for non-existent trade', async () => {
      const updateData = {
        tags: [{ tag: MindsetTagType.DISCIPLINED, intensity: IntensityLevel.HIGH }]
      };

      await request(app)
        .patch('/api/trades/non-existent-id/mindset')
        .set(authHeaders)
        .send(updateData)
        .expect(404);
    });
  });

  describe('GET /api/trades with mindset tags', () => {
    test('should return trades with mindset tags included', async () => {
      // Create a trade with mindset tags
      const tradeData = {
        symbol: 'NVDA',
        direction: 'LONG',
        entryPrice: 400,
        positionSize: 2,
        stopLoss: 380,
        mindsetTags: [
          { tag: MindsetTagType.CONFIDENT, intensity: IntensityLevel.HIGH }
        ]
      };

      await request(app)
        .post('/api/trades')
        .set(authHeaders)
        .send(tradeData)
        .expect(201);

      // Get trades and verify mindset tags are included
      const response = await request(app)
        .get('/api/trades')
        .set(authHeaders)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      
      const tradeWithMindsetTags = response.body.data.find(
        (trade: any) => trade.symbol === 'NVDA'
      );
      
      expect(tradeWithMindsetTags).toBeDefined();
      expect(tradeWithMindsetTags.mindsetTags).toBeDefined();
      expect(tradeWithMindsetTags.mindsetTags).toHaveLength(1);
      expect(tradeWithMindsetTags.mindsetTags[0].tag).toBe(MindsetTagType.CONFIDENT);
      expect(tradeWithMindsetTags.mindsetTags[0].intensity).toBe(IntensityLevel.HIGH);
    });
  });
});