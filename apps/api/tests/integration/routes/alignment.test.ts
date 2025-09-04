import request from 'supertest';
import { describe, it, expect, beforeEach } from '@jest/globals';
import app from '../../../src/app';
import { IndicatorType, SignalType, TimeframeType, DivergenceType } from '@trading-log/shared';

const API_BASE = '/api/alignment';

describe('Alignment API Integration Tests', () => {
  describe('POST /api/alignment/analyze', () => {
    it('should analyze alignment for valid request with LONG trade and bullish signals', async () => {
      const requestData = {
        direction: 'LONG',
        methodAnalysis: [
          {
            id: 'test-1',
            tradeId: 'test-trade',
            timeframe: TimeframeType.DAILY,
            indicator: IndicatorType.MACD,
            signal: SignalType.BUY_SIGNAL,
            divergence: DivergenceType.BULLISH,
            notes: 'Strong bullish MACD signal',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
      };

      const response = await request(app)
        .post(`${API_BASE}/analyze`)
        .set('Authorization', 'Bearer dev-token')
        .send(requestData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('overallScore');
      expect(response.body.data).toHaveProperty('alignmentLevel');
      expect(response.body.data).toHaveProperty('warnings');
      expect(response.body.data).toHaveProperty('confirmations');
      expect(response.body.data).toHaveProperty('timeframeBreakdown');

      expect(response.body.data.alignmentLevel).toBe('STRONG_ALIGNMENT');
      expect(response.body.data.overallScore).toBeGreaterThan(0.8);
      expect(response.body.data.confirmations.length).toBeGreaterThan(0);
      expect(response.body.data.warnings.length).toBe(0);
    });

    it('should analyze alignment for SHORT trade with bearish signals', async () => {
      const requestData = {
        direction: 'SHORT',
        methodAnalysis: [
          {
            id: 'test-1',
            tradeId: 'test-trade',
            timeframe: TimeframeType.DAILY,
            indicator: IndicatorType.MACD,
            signal: SignalType.SELL_SIGNAL,
            divergence: DivergenceType.BEARISH,
            notes: 'Strong bearish MACD signal',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
      };

      const response = await request(app)
        .post(`${API_BASE}/analyze`)
        .set('Authorization', 'Bearer dev-token')
        .send(requestData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.alignmentLevel).toBe('STRONG_ALIGNMENT');
      expect(response.body.data.overallScore).toBeGreaterThan(0.8);
      expect(response.body.data.confirmations.length).toBeGreaterThan(0);
    });

    it('should detect strong conflict for conflicting signals', async () => {
      const requestData = {
        direction: 'LONG',
        methodAnalysis: [
          {
            id: 'test-1',
            tradeId: 'test-trade',
            timeframe: TimeframeType.DAILY,
            indicator: IndicatorType.MACD,
            signal: SignalType.SELL_SIGNAL,
            divergence: DivergenceType.BEARISH,
            notes: 'Bearish MACD signal',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
      };

      const response = await request(app)
        .post(`${API_BASE}/analyze`)
        .set('Authorization', 'Bearer dev-token')
        .send(requestData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.alignmentLevel).toBe('STRONG_CONFLICT');
      expect(response.body.data.overallScore).toBeLessThan(-0.8);
      expect(response.body.data.warnings.length).toBeGreaterThan(0);
      expect(response.body.data.confirmations.length).toBe(0);
    });

    it('should handle multiple timeframe analysis', async () => {
      const requestData = {
        direction: 'LONG',
        methodAnalysis: [
          {
            id: 'test-1',
            tradeId: 'test-trade',
            timeframe: TimeframeType.MONTHLY,
            indicator: IndicatorType.SUPPORT_RESISTANCE,
            signal: SignalType.BREAKOUT,
            divergence: DivergenceType.NONE,
            notes: 'Monthly resistance breakout',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            id: 'test-2',
            tradeId: 'test-trade',
            timeframe: TimeframeType.WEEKLY,
            indicator: IndicatorType.RSI,
            signal: SignalType.OVERSOLD,
            divergence: DivergenceType.NONE,
            notes: 'Weekly RSI oversold',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            id: 'test-3',
            tradeId: 'test-trade',
            timeframe: TimeframeType.DAILY,
            indicator: IndicatorType.MACD,
            signal: SignalType.BUY_SIGNAL,
            divergence: DivergenceType.BULLISH,
            notes: 'Daily MACD buy signal',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
      };

      const response = await request(app)
        .post(`${API_BASE}/analyze`)
        .set('Authorization', 'Bearer dev-token')
        .send(requestData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.timeframeBreakdown).toHaveLength(3);
      expect(response.body.data.alignmentLevel).toBe('STRONG_ALIGNMENT');
      
      // Verify timeframe breakdown structure
      const breakdown = response.body.data.timeframeBreakdown;
      expect(breakdown[0]).toHaveProperty('timeframe');
      expect(breakdown[0]).toHaveProperty('score');
      expect(breakdown[0]).toHaveProperty('analysis');
      expect(breakdown[0]).toHaveProperty('alignment');
    });

    it('should return 400 for invalid trade direction', async () => {
      const requestData = {
        direction: 'INVALID',
        methodAnalysis: [
          {
            id: 'test-1',
            tradeId: 'test-trade',
            timeframe: TimeframeType.DAILY,
            indicator: IndicatorType.MACD,
            signal: SignalType.BUY_SIGNAL,
            divergence: DivergenceType.NONE,
            notes: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
      };

      const response = await request(app)
        .post(`${API_BASE}/analyze`)
        .set('Authorization', 'Bearer dev-token')
        .send(requestData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid or missing trade direction');
    });

    it('should return 400 for empty method analysis', async () => {
      const requestData = {
        direction: 'LONG',
        methodAnalysis: [],
      };

      const response = await request(app)
        .post(`${API_BASE}/analyze`)
        .set('Authorization', 'Bearer dev-token')
        .send(requestData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Method analysis is required');
    });

    it('should return 400 for duplicate timeframes', async () => {
      const requestData = {
        direction: 'LONG',
        methodAnalysis: [
          {
            id: 'test-1',
            tradeId: 'test-trade',
            timeframe: TimeframeType.DAILY,
            indicator: IndicatorType.MACD,
            signal: SignalType.BUY_SIGNAL,
            divergence: DivergenceType.NONE,
            notes: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            id: 'test-2',
            tradeId: 'test-trade',
            timeframe: TimeframeType.DAILY, // Duplicate
            indicator: IndicatorType.RSI,
            signal: SignalType.OVERSOLD,
            divergence: DivergenceType.NONE,
            notes: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
      };

      const response = await request(app)
        .post(`${API_BASE}/analyze`)
        .set('Authorization', 'Bearer dev-token')
        .send(requestData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Duplicate timeframe analysis');
    });

    it('should return 400 for missing request data', async () => {
      const response = await request(app)
        .post(`${API_BASE}/analyze`)
        .set('Authorization', 'Bearer dev-token')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should handle mixed signals correctly', async () => {
      const requestData = {
        direction: 'LONG',
        methodAnalysis: [
          {
            id: 'test-1',
            tradeId: 'test-trade',
            timeframe: TimeframeType.DAILY,
            indicator: IndicatorType.MACD,
            signal: SignalType.BUY_SIGNAL,
            divergence: DivergenceType.BULLISH,
            notes: 'Bullish MACD',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            id: 'test-2',
            tradeId: 'test-trade',
            timeframe: TimeframeType.WEEKLY,
            indicator: IndicatorType.RSI,
            signal: SignalType.OVERBOUGHT,
            divergence: DivergenceType.NONE,
            notes: 'RSI overbought',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
      };

      const response = await request(app)
        .post(`${API_BASE}/analyze`)
        .set('Authorization', 'Bearer dev-token')
        .send(requestData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(['WEAK_ALIGNMENT', 'NEUTRAL', 'WEAK_CONFLICT']).toContain(
        response.body.data.alignmentLevel
      );
      expect(response.body.data.warnings.length).toBeGreaterThanOrEqual(0);
      expect(response.body.data.confirmations.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle unknown indicators gracefully', async () => {
      const requestData = {
        direction: 'LONG',
        methodAnalysis: [
          {
            id: 'test-1',
            tradeId: 'test-trade',
            timeframe: TimeframeType.DAILY,
            indicator: IndicatorType.OTHER,
            signal: SignalType.NEUTRAL,
            divergence: DivergenceType.NONE,
            notes: 'Custom indicator',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
      };

      const response = await request(app)
        .post(`${API_BASE}/analyze`)
        .set('Authorization', 'Bearer dev-token')
        .send(requestData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.alignmentLevel).toBe('NEUTRAL');
      expect(response.body.data.overallScore).toBe(0);
    });
  });

  describe('Authentication', () => {
    it('should require authentication', async () => {
      const requestData = {
        direction: 'LONG',
        methodAnalysis: [
          {
            id: 'test-1',
            tradeId: 'test-trade',
            timeframe: TimeframeType.DAILY,
            indicator: IndicatorType.MACD,
            signal: SignalType.BUY_SIGNAL,
            divergence: DivergenceType.NONE,
            notes: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
      };

      const response = await request(app)
        .post(`${API_BASE}/analyze`)
        // No Authorization header
        .send(requestData)
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });
});