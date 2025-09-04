import { 
  validateMethodAnalysis, 
  IndicatorType, 
  SignalType, 
  TimeframeType, 
  DivergenceType,
  CreateMethodAnalysisRequest 
} from '@trading-log/shared';

describe('Method Analysis Validation', () => {
  describe('validateMethodAnalysis', () => {
    it('should validate complete method analysis', () => {
      const analysis: CreateMethodAnalysisRequest[] = [
        {
          timeframe: TimeframeType.DAILY,
          indicator: IndicatorType.MACD,
          signal: SignalType.BUY_SIGNAL,
          divergence: DivergenceType.BULLISH,
          notes: 'Strong momentum divergence'
        },
        {
          timeframe: TimeframeType.WEEKLY,
          indicator: IndicatorType.RSI,
          signal: SignalType.OVERSOLD,
          divergence: DivergenceType.NONE,
          notes: 'RSI showing oversold conditions'
        }
      ];

      const result = validateMethodAnalysis(analysis);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject duplicate timeframe analysis', () => {
      const analysis: CreateMethodAnalysisRequest[] = [
        {
          timeframe: TimeframeType.DAILY,
          indicator: IndicatorType.MACD,
          signal: SignalType.BUY_SIGNAL,
          divergence: DivergenceType.BULLISH
        },
        {
          timeframe: TimeframeType.DAILY, // Duplicate
          indicator: IndicatorType.RSI,
          signal: SignalType.OVERSOLD,
          divergence: DivergenceType.NONE
        }
      ];

      const result = validateMethodAnalysis(analysis);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Duplicate timeframe analysis');
    });

    it('should reject missing indicator', () => {
      const analysis: CreateMethodAnalysisRequest[] = [
        {
          timeframe: TimeframeType.DAILY,
          indicator: '' as any, // Invalid
          signal: SignalType.BUY_SIGNAL,
          divergence: DivergenceType.BULLISH
        }
      ];

      const result = validateMethodAnalysis(analysis);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Missing indicator or signal for DAILY');
    });

    it('should reject missing signal', () => {
      const analysis: CreateMethodAnalysisRequest[] = [
        {
          timeframe: TimeframeType.DAILY,
          indicator: IndicatorType.MACD,
          signal: '' as any, // Invalid
          divergence: DivergenceType.BULLISH
        }
      ];

      const result = validateMethodAnalysis(analysis);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Missing indicator or signal for DAILY');
    });

    it('should validate empty analysis array', () => {
      const result = validateMethodAnalysis([]);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should validate single timeframe analysis', () => {
      const analysis: CreateMethodAnalysisRequest[] = [
        {
          timeframe: TimeframeType.MONTHLY,
          indicator: IndicatorType.VOLUME,
          signal: SignalType.BREAKOUT,
          divergence: DivergenceType.NONE,
          notes: 'Volume spike on breakout'
        }
      ];

      const result = validateMethodAnalysis(analysis);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });
});