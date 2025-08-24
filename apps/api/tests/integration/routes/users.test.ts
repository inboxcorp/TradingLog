import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import { PrismaClient } from '@prisma/client';
import userRoutes from '../../../src/routes/users';

const app = express();
app.use(express.json());
app.use('/api/user', userRoutes);

const prisma = new PrismaClient();

describe('User API Routes', () => {
  const testUserId = 'test-user-1';
  const authToken = 'dev-token';

  beforeEach(async () => {
    // Clean up any existing test user
    await prisma.user.deleteMany({
      where: { id: testUserId },
    });
  });

  afterEach(async () => {
    // Clean up test data
    await prisma.user.deleteMany({
      where: { id: testUserId },
    });
  });

  describe('GET /api/user', () => {
    it('should return 401 without auth token', async () => {
      const response = await request(app)
        .get('/api/user');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Access token required');
    });

    it('should create and return user if not exists', async () => {
      const response = await request(app)
        .get('/api/user')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBe(testUserId);
      expect(response.body.data.email).toBe('dev@example.com');
      expect(response.body.data.totalEquity).toBe(10000);
    });

    it('should return existing user if exists', async () => {
      // Create user first
      await prisma.user.create({
        data: {
          id: testUserId,
          email: 'test@example.com',
          totalEquity: 5000,
        },
      });

      const response = await request(app)
        .get('/api/user')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(testUserId);
      expect(response.body.data.email).toBe('test@example.com');
      expect(response.body.data.totalEquity).toBe(5000);
    });
  });

  describe('PATCH /api/user', () => {
    it('should return 401 without auth token', async () => {
      const response = await request(app)
        .patch('/api/user')
        .send({ totalEquity: 15000 });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should update equity for existing user', async () => {
      // Create user first
      await prisma.user.create({
        data: {
          id: testUserId,
          email: 'test@example.com',
          totalEquity: 10000,
        },
      });

      const response = await request(app)
        .patch('/api/user')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ totalEquity: 15000 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.totalEquity).toBe(15000);
      expect(response.body.message).toBe('Equity updated successfully');
    });

    it('should create user if not exists', async () => {
      const response = await request(app)
        .patch('/api/user')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ totalEquity: 20000 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(testUserId);
      expect(response.body.data.totalEquity).toBe(20000);
    });

    it('should validate request body - missing totalEquity', async () => {
      const response = await request(app)
        .patch('/api/user')
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid request data');
    });

    it('should validate request body - negative equity', async () => {
      const response = await request(app)
        .patch('/api/user')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ totalEquity: -1000 });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid request data');
    });

    it('should validate equity value - too large', async () => {
      const response = await request(app)
        .patch('/api/user')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ totalEquity: 1000000001 }); // Above 1B limit

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid equity value. Must be positive and within reasonable limits.');
    });

    it('should handle decimal precision correctly', async () => {
      const response = await request(app)
        .patch('/api/user')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ totalEquity: 10000.55 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.totalEquity).toBe(10000.55);
    });

    it('should handle very small decimal amounts', async () => {
      const response = await request(app)
        .patch('/api/user')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ totalEquity: 0.01 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.totalEquity).toBe(0.01);
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      // This would require mocking Prisma to simulate database errors
      // For now, we'll test with invalid auth token
      const response = await request(app)
        .get('/api/user')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid or expired token');
    });
  });
});