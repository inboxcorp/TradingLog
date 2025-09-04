import { describe, it, expect } from '@jest/globals';
import { analyzeAlignment, validateAlignmentRequest, ALIGNMENT_RULES } from '../alignment';
import { MethodAnalysis, IndicatorType, SignalType, TimeframeType, DivergenceType, TradeDirection } from '../../types';

// Helper function to create mock method analysis
const createMockMethodAnalysis = (
  overrides: Partial<MethodAnalysis> = {}
): MethodAnalysis => ({
  id: 'test-id',
  tradeId: 'test-trade-id',
  timeframe: TimeframeType.DAILY,
  indicator: IndicatorType.MACD,
  signal: SignalType.BUY_SIGNAL,
  divergence: DivergenceType.NONE,
  notes: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe('Alignment Rules Engine', () => {
  describe('analyzeAlignment', () => {
    it('should return strong alignment for bullish MACD buy signal on LONG trade', () => {
      const methodAnalysis = [
        createMockMethodAnalysis({
          indicator: IndicatorType.MACD,
          signal: SignalType.BUY_SIGNAL,
          divergence: DivergenceType.BULLISH,
        }),
      ];

      const result = analyzeAlignment('LONG', methodAnalysis);

      expect(result.alignmentLevel).toBe('STRONG_ALIGNMENT');
      expect(result.overallScore).toBeGreaterThan(0.8);
      expect(result.warnings).toHaveLength(0);
      expect(result.confirmations.length).toBeGreaterThan(0);
    });

    it('should return strong conflict for bearish MACD sell signal on LONG trade', () => {
      const methodAnalysis = [
        createMockMethodAnalysis({
          indicator: IndicatorType.MACD,
          signal: SignalType.SELL_SIGNAL,
          divergence: DivergenceType.BEARISH,
        }),
      ];

      const result = analyzeAlignment('LONG', methodAnalysis);

      expect(result.alignmentLevel).toBe('STRONG_CONFLICT');
      expect(result.overallScore).toBeLessThan(-0.8);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.confirmations).toHaveLength(0);
    });

    it('should handle multiple timeframe analysis correctly', () => {
      const methodAnalysis = [
        createMockMethodAnalysis({
          timeframe: TimeframeType.DAILY,
          indicator: IndicatorType.MACD,
          signal: SignalType.BUY_SIGNAL,
          divergence: DivergenceType.BULLISH,
        }),
        createMockMethodAnalysis({
          timeframe: TimeframeType.WEEKLY,
          indicator: IndicatorType.RSI,
          signal: SignalType.OVERSOLD,
          divergence: DivergenceType.NONE,
        }),
      ];

      const result = analyzeAlignment('LONG', methodAnalysis);

      expect(result.timeframeBreakdown).toHaveLength(2);
      expect(result.timeframeBreakdown[0].timeframe).toBe(TimeframeType.DAILY);
      expect(result.timeframeBreakdown[1].timeframe).toBe(TimeframeType.WEEKLY);
      expect(result.alignmentLevel).toBe('STRONG_ALIGNMENT');
    });

    it('should apply divergence multiplier correctly', () => {
      const analysisWithDivergence = [
        createMockMethodAnalysis({
          indicator: IndicatorType.MACD,
          signal: SignalType.BUY_SIGNAL,
          divergence: DivergenceType.BULLISH,
        }),
      ];

      const analysisWithoutDivergence = [
        createMockMethodAnalysis({
          indicator: IndicatorType.MACD,
          signal: SignalType.BUY_SIGNAL,
          divergence: DivergenceType.NONE,
        }),
      ];

      const resultWithDivergence = analyzeAlignment('LONG', analysisWithDivergence);
      const resultWithoutDivergence = analyzeAlignment('LONG', analysisWithoutDivergence);

      expect(resultWithDivergence.overallScore).toBeGreaterThan(resultWithoutDivergence.overallScore);
    });

    it('should handle mixed signals correctly', () => {
      const methodAnalysis = [
        createMockMethodAnalysis({
          timeframe: TimeframeType.DAILY,
          indicator: IndicatorType.MACD,
          signal: SignalType.BUY_SIGNAL,
          divergence: DivergenceType.NONE,
        }),
        createMockMethodAnalysis({
          timeframe: TimeframeType.WEEKLY,
          indicator: IndicatorType.RSI,
          signal: SignalType.OVERBOUGHT,
          divergence: DivergenceType.NONE,
        }),
      ];

      const result = analyzeAlignment('LONG', methodAnalysis);

      expect(['WEAK_ALIGNMENT', 'NEUTRAL', 'WEAK_CONFLICT']).toContain(result.alignmentLevel);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('should generate appropriate warnings and confirmations', () => {
      const conflictingAnalysis = [
        createMockMethodAnalysis({
          indicator: IndicatorType.MACD,
          signal: SignalType.SELL_SIGNAL,
          divergence: DivergenceType.BEARISH,
        }),
      ];

      const result = analyzeAlignment('LONG', conflictingAnalysis);

      expect(result.warnings).toContain(
        expect.stringMatching(/conflicts with LONG direction/)
      );
      expect(result.warnings).toContain(
        expect.stringMatching(/BEARISH divergence conflicts/)
      );
    });

    it('should handle SHORT trades correctly', () => {
      const methodAnalysis = [
        createMockMethodAnalysis({
          indicator: IndicatorType.MACD,
          signal: SignalType.SELL_SIGNAL,
          divergence: DivergenceType.BEARISH,
        }),
      ];

      const result = analyzeAlignment('SHORT', methodAnalysis);

      expect(result.alignmentLevel).toBe('STRONG_ALIGNMENT');
      expect(result.overallScore).toBeGreaterThan(0.8);
      expect(result.confirmations.length).toBeGreaterThan(0);
    });

    it('should handle unknown indicator/signal combinations gracefully', () => {
      const methodAnalysis = [
        createMockMethodAnalysis({
          indicator: IndicatorType.OTHER,
          signal: SignalType.NEUTRAL,
          divergence: DivergenceType.NONE,
        }),
      ];

      const result = analyzeAlignment('LONG', methodAnalysis);

      expect(result.alignmentLevel).toBe('NEUTRAL');
      expect(result.overallScore).toBe(0);
    });
  });

  describe('validateAlignmentRequest', () => {
    it('should validate valid alignment request', () => {
      const methodAnalysis = [
        createMockMethodAnalysis(),
      ];

      const result = validateAlignmentRequest('LONG', methodAnalysis);

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject invalid trade direction', () => {
      const methodAnalysis = [createMockMethodAnalysis()];

      const result = validateAlignmentRequest('INVALID' as TradeDirection, methodAnalysis);

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Invalid or missing trade direction');
    });

    it('should reject empty method analysis', () => {
      const result = validateAlignmentRequest('LONG', []);

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Method analysis is required');
    });

    it('should reject duplicate timeframes', () => {
      const methodAnalysis = [
        createMockMethodAnalysis({ timeframe: TimeframeType.DAILY }),
        createMockMethodAnalysis({ timeframe: TimeframeType.DAILY }), // Duplicate
      ];

      const result = validateAlignmentRequest('LONG', methodAnalysis);

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Duplicate timeframe analysis');
    });
  });

  describe('ALIGNMENT_RULES', () => {
    it('should have rules for all major indicators', () => {
      const indicators = [
        IndicatorType.MACD,
        IndicatorType.RSI,
        IndicatorType.STOCHASTICS,
        IndicatorType.MOVING_AVERAGES,
        IndicatorType.SUPPORT_RESISTANCE,
        IndicatorType.BOLLINGER_BANDS,
      ];

      indicators.forEach(indicator => {
        const rule = ALIGNMENT_RULES.find(r => r.indicator === indicator);
        expect(rule).toBeDefined();
      });
    });

    it('should have balanced bullish/bearish alignments for directional signals', () => {
      const buySignalRule = ALIGNMENT_RULES.find(
        r => r.indicator === IndicatorType.MACD && r.signal === SignalType.BUY_SIGNAL
      );
      const sellSignalRule = ALIGNMENT_RULES.find(
        r => r.indicator === IndicatorType.MACD && r.signal === SignalType.SELL_SIGNAL
      );

      expect(buySignalRule).toBeDefined();
      expect(sellSignalRule).toBeDefined();
      
      if (buySignalRule && sellSignalRule) {
        expect(buySignalRule.bullishAlignment).toBe(-sellSignalRule.bearishAlignment);
        expect(buySignalRule.bearishAlignment).toBe(-sellSignalRule.bullishAlignment);
      }
    });

    it('should have weights between 0 and 1', () => {
      ALIGNMENT_RULES.forEach(rule => {
        expect(rule.weight).toBeGreaterThan(0);
        expect(rule.weight).toBeLessThanOrEqual(1);
      });
    });

    it('should have alignment scores between -1 and 1', () => {
      ALIGNMENT_RULES.forEach(rule => {
        expect(rule.bullishAlignment).toBeGreaterThanOrEqual(-1);
        expect(rule.bullishAlignment).toBeLessThanOrEqual(1);
        expect(rule.bearishAlignment).toBeGreaterThanOrEqual(-1);
        expect(rule.bearishAlignment).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle single analysis with neutral signal', () => {
      const methodAnalysis = [
        createMockMethodAnalysis({
          signal: SignalType.NEUTRAL,
          divergence: DivergenceType.NONE,
        }),
      ];

      const result = analyzeAlignment('LONG', methodAnalysis);

      expect(result.alignmentLevel).toBe('NEUTRAL');
      expect(result.overallScore).toBe(0);
    });

    it('should handle complex multi-timeframe scenario', () => {
      const methodAnalysis = [
        createMockMethodAnalysis({
          timeframe: TimeframeType.MONTHLY,
          indicator: IndicatorType.SUPPORT_RESISTANCE,
          signal: SignalType.BREAKOUT,
          divergence: DivergenceType.NONE,
        }),
        createMockMethodAnalysis({
          timeframe: TimeframeType.WEEKLY,
          indicator: IndicatorType.MOVING_AVERAGES,
          signal: SignalType.CONTINUATION,
          divergence: DivergenceType.BULLISH,
        }),
        createMockMethodAnalysis({
          timeframe: TimeframeType.DAILY,
          indicator: IndicatorType.MACD,
          signal: SignalType.BUY_SIGNAL,
          divergence: DivergenceType.BULLISH,
        }),
      ];

      const result = analyzeAlignment('LONG', methodAnalysis);

      expect(result.timeframeBreakdown).toHaveLength(3);
      expect(result.alignmentLevel).toBe('STRONG_ALIGNMENT');
      expect(result.confirmations.length).toBeGreaterThan(2);
    });
  });
});